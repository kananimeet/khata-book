import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Expense } from './entities/expense.entity.js';
import { ExpensePayment } from './entities/expense-payment.entity.js';
import { User } from '../user/entities/user.entity.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  ExpenseStatus,
  ExpensePaymentStatus,
} from '../common/enums/expense-status.enum.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { QueryExpenseDto } from './dto/query-expense.dto.js';
import {
  ApproveExpenseDto,
  RejectExpenseDto,
} from './dto/approve-reject-expense.dto.js';
import {
  EXPENSE_NOT_FOUND,
  EXPENSE_PAYMENT_NOT_FOUND,
  EXPENSE_USER_NOT_ALLOWED_TO_EDIT,
  EXPENSE_ALREADY_COMPLETED,
  EXPENSE_AMOUNT_EXCEEDS_REMAINING,
  EXPENSE_PAY_GREATER_THAN_TOTAL,
  EXPENSE_PREVIOUS_PAYMENT_PENDING,
  EXPENSE_INITIAL_REQUEST_PENDING,
  FORBIDDEN,
  USER_NOT_FOUND,
} from '../common/message.js';
import { SettingService } from '../setting/setting.service.js';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(ExpensePayment)
    private readonly paymentRepository: Repository<ExpensePayment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly settingService: SettingService,
  ) {}

  /**
   * User or Admin creates an expense request.
   * If expense_id is passed, it adds a payment request to that existing expense.
   * If user has an active remaining expense and submits a payment, routes to that expense.
   */
  async create(
    userId: string,
    createDto: CreateExpenseDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<Expense> {
    if (userRole === UserRole.ADMIN && (createDto.user_id || createDto.userId)) {
      const targetUserId = (createDto.user_id || createDto.userId)!;
      const targetUser = await this.userRepository.findOne({
        where: { id: targetUserId },
      });
      if (!targetUser) {
        throw new NotFoundException(USER_NOT_FOUND(targetUserId));
      }
      userId = targetUserId;
    }

    const payAmount = Number(
      createDto.pay_amount ?? createDto.pay ?? createDto.amount,
    );
    const note =
      (createDto.note ?? createDto.description ?? createDto.title)?.trim() ||
      'room pay';
    const effectiveTotal = createDto.total_amount ?? createDto.total;

    if (createDto.expense_id) {
      return this.createPayment(
        createDto.expense_id,
        userId,
        {
          pay_amount: payAmount,
          note: note,
        },
        userRole === UserRole.ADMIN,
      );
    }

    // If user has an existing remaining expense and did not provide total_amount or provided same total
    const activeRemainingExpense = await this.expenseRepository.findOne({
      where: { user_id: userId, status: ExpenseStatus.REMAINING },
      relations: { user: true, payments: true },
      order: { created_at: 'DESC' },
    });

    if (
      activeRemainingExpense &&
      (!effectiveTotal ||
        Number(effectiveTotal) ===
          Number(activeRemainingExpense.total_amount))
    ) {
      return this.createPayment(
        activeRemainingExpense.id,
        userId,
        {
          pay_amount: payAmount,
          note: note,
        },
        userRole === UserRole.ADMIN,
      );
    }

    let totalAmount: number;
    if (
      effectiveTotal !== undefined &&
      effectiveTotal !== null &&
      !isNaN(Number(effectiveTotal))
    ) {
      totalAmount = Number(effectiveTotal);
    } else {
      totalAmount = await this.settingService.getDefaultTotalAmount();
    }

    if (payAmount > totalAmount) {
      throw new BadRequestException(EXPENSE_PAY_GREATER_THAN_TOTAL);
    }

    // Remaining balance is total - pay (if pending, projected remaining is total - pay)
    const remainingAmount = Math.max(0, totalAmount - payAmount);

    const expense = this.expenseRepository.create({
      user_id: userId,
      note: note,
      total_amount: totalAmount,
      pay_amount: payAmount,
      paid_amount: 0, // Until admin approves, approved total is 0
      remaining_amount: remainingAmount,
      status: ExpenseStatus.PENDING,
    });

    const savedExpense = await this.expenseRepository.save(expense);

    // Create initial payment request record
    const payment = this.paymentRepository.create({
      expense_id: savedExpense.id,
      user_id: userId,
      amount: payAmount,
      note: note,
      status: ExpensePaymentStatus.PENDING,
    });

    await this.paymentRepository.save(payment);

    return this.findById(savedExpense.id, { id: userId, role: userRole });
  }

  /**
   * User creates second request (e.g. paying remaining amount) against an existing expense
   */
  async createPayment(
    expenseId: string,
    userId: string,
    paymentDto: CreatePaymentDto,
    isAdmin = false,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      relations: { user: true, payments: true },
    });

    if (!expense) {
      throw new NotFoundException(EXPENSE_NOT_FOUND);
    }

    if (!isAdmin && expense.user_id !== userId) {
      throw new ForbiddenException(FORBIDDEN);
    }

    if (
      expense.status === ExpenseStatus.COMPLETE ||
      Number(expense.remaining_amount) <= 0
    ) {
      throw new BadRequestException(EXPENSE_ALREADY_COMPLETED);
    }

    if (expense.status === ExpenseStatus.PENDING) {
      throw new BadRequestException(EXPENSE_INITIAL_REQUEST_PENDING);
    }

    // Check if there is already another pending payment request
    const hasPendingPayment = (expense.payments || []).some(
      (p) => p.status === ExpensePaymentStatus.PENDING,
    );
    if (hasPendingPayment) {
      throw new BadRequestException(EXPENSE_PREVIOUS_PAYMENT_PENDING);
    }

    const payAmount = Number(
      paymentDto.pay_amount ?? paymentDto.pay ?? paymentDto.amount,
    );
    const remainingAmount = Number(expense.remaining_amount);

    if (payAmount > remainingAmount) {
      throw new BadRequestException(
        EXPENSE_AMOUNT_EXCEEDS_REMAINING(remainingAmount, payAmount),
      );
    }

    const note =
      (paymentDto.note ?? paymentDto.description)?.trim() ||
      `Remaining payment of ${payAmount} for ${expense.note || 'room pay'}`;

    // Create payment request
    const payment = this.paymentRepository.create({
      expense_id: expense.id,
      user_id: expense.user_id,
      amount: payAmount,
      note: note,
      status: ExpensePaymentStatus.PENDING,
    });

    await this.paymentRepository.save(payment);

    // Update active pay_amount so UI reflects current pending request
    await this.expenseRepository.update(expense.id, {
      pay_amount: payAmount,
    });

    return this.findById(expense.id, {
      id: userId,
      role: isAdmin ? UserRole.ADMIN : UserRole.USER,
    });
  }

  /**
   * Admin approves an expense (approves its pending payment(s) and updates paid_amount & remaining)
   */
  async approveExpense(
    expenseId: string,
    approveDto?: ApproveExpenseDto,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      relations: { payments: true, user: true },
    });

    if (!expense) {
      throw new NotFoundException(EXPENSE_NOT_FOUND);
    }

    const adminNote =
      approveDto?.admin_note ?? approveDto?.note ?? approveDto?.comment;

    // Find pending payments (or rejected payments if expense was previously rejected)
    const paymentsToApprove = (expense.payments || []).filter(
      (p) =>
        p.status === ExpensePaymentStatus.PENDING ||
        (expense.status === ExpenseStatus.REJECTED &&
          p.status === ExpensePaymentStatus.REJECTED),
    );

    if (paymentsToApprove.length > 0) {
      for (const p of paymentsToApprove) {
        p.status = ExpensePaymentStatus.APPROVED;
        if (adminNote) {
          p.admin_note = adminNote;
        }
        await this.paymentRepository.save(p);
      }
    } else if (
      expense.status === ExpenseStatus.PENDING ||
      expense.status === ExpenseStatus.REJECTED
    ) {
      // If there were no explicit payments, create an approved payment for the pay_amount
      const payment = this.paymentRepository.create({
        expense_id: expense.id,
        user_id: expense.user_id,
        amount: Number(expense.pay_amount),
        note: expense.note || 'room pay',
        status: ExpensePaymentStatus.APPROVED,
        admin_note: adminNote,
      });
      await this.paymentRepository.save(payment);
    }

    // Always recalculate from all approved payments
    const allApproved = await this.paymentRepository.find({
      where: {
        expense_id: expense.id,
        status: ExpensePaymentStatus.APPROVED,
      },
    });
    const currentPaid = allApproved.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const total = Number(expense.total_amount);
    const remaining = Math.max(0, total - currentPaid);

    expense.paid_amount = currentPaid;
    expense.remaining_amount = remaining;
    expense.status =
      remaining <= 0 ? ExpenseStatus.COMPLETE : ExpenseStatus.REMAINING;

    if (adminNote) {
      expense.admin_note = adminNote;
    }

    await this.expenseRepository.save(expense);

    return this.findById(expense.id, {
      id: expense.user_id,
      role: UserRole.ADMIN,
    });
  }

  /**
   * Admin rejects an expense request
   */
  async rejectExpense(
    expenseId: string,
    rejectDto?: RejectExpenseDto,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      relations: { payments: true, user: true },
    });

    if (!expense) {
      throw new NotFoundException(EXPENSE_NOT_FOUND);
    }

    const adminNote =
      rejectDto?.reason ?? rejectDto?.admin_note ?? rejectDto?.note;

    const pendingPayments = (expense.payments || []).filter(
      (p) => p.status === ExpensePaymentStatus.PENDING,
    );

    for (const p of pendingPayments) {
      p.status = ExpensePaymentStatus.REJECTED;
      if (adminNote) {
        p.admin_note = adminNote;
      }
      await this.paymentRepository.save(p);
    }

    const allApproved = await this.paymentRepository.find({
      where: {
        expense_id: expense.id,
        status: ExpensePaymentStatus.APPROVED,
      },
    });
    const currentPaid = allApproved.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const total = Number(expense.total_amount);
    const remaining = Math.max(0, total - currentPaid);

    expense.paid_amount = currentPaid;
    expense.remaining_amount = remaining;

    if (currentPaid <= 0) {
      expense.status = ExpenseStatus.REJECTED;
    } else {
      expense.status =
        remaining <= 0 ? ExpenseStatus.COMPLETE : ExpenseStatus.REMAINING;
    }

    if (adminNote) {
      expense.admin_note = adminNote;
    }

    await this.expenseRepository.save(expense);

    return this.findById(expense.id, {
      id: expense.user_id,
      role: UserRole.ADMIN,
    });
  }

  /**
   * Admin approves a specific installment payment
   */
  async approvePayment(
    paymentId: string,
    approveDto?: ApproveExpenseDto,
  ): Promise<Expense> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: { expense: true },
    });

    if (!payment) {
      throw new NotFoundException(EXPENSE_PAYMENT_NOT_FOUND);
    }

    const adminNote =
      approveDto?.admin_note ?? approveDto?.note ?? approveDto?.comment;

    payment.status = ExpensePaymentStatus.APPROVED;
    if (adminNote) {
      payment.admin_note = adminNote;
    }
    await this.paymentRepository.save(payment);

    const expense = await this.expenseRepository.findOne({
      where: { id: payment.expense_id },
    });

    if (expense) {
      const allApproved = await this.paymentRepository.find({
        where: {
          expense_id: payment.expense_id,
          status: ExpensePaymentStatus.APPROVED,
        },
      });
      const newPaid = allApproved.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const total = Number(expense.total_amount);
      const remaining = Math.max(0, total - newPaid);

      expense.paid_amount = newPaid;
      expense.remaining_amount = remaining;
      expense.status =
        remaining <= 0 ? ExpenseStatus.COMPLETE : ExpenseStatus.REMAINING;

      if (adminNote) {
        expense.admin_note = adminNote;
      }

      await this.expenseRepository.save(expense);
    }

    return this.findById(payment.expense_id, {
      id: payment.user_id,
      role: UserRole.ADMIN,
    });
  }

  /**
   * Admin rejects a specific installment payment
   */
  async rejectPayment(
    paymentId: string,
    rejectDto?: RejectExpenseDto,
  ): Promise<Expense> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(EXPENSE_PAYMENT_NOT_FOUND);
    }

    const adminNote =
      rejectDto?.reason ?? rejectDto?.admin_note ?? rejectDto?.note;

    payment.status = ExpensePaymentStatus.REJECTED;
    if (adminNote) {
      payment.admin_note = adminNote;
    }
    await this.paymentRepository.save(payment);

    const expense = await this.expenseRepository.findOne({
      where: { id: payment.expense_id },
    });

    if (expense) {
      const allApproved = await this.paymentRepository.find({
        where: {
          expense_id: payment.expense_id,
          status: ExpensePaymentStatus.APPROVED,
        },
      });
      const newPaid = allApproved.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const total = Number(expense.total_amount);
      const remaining = Math.max(0, total - newPaid);

      expense.paid_amount = newPaid;
      expense.remaining_amount = remaining;

      if (newPaid <= 0) {
        const hasPending = await this.paymentRepository.count({
          where: {
            expense_id: payment.expense_id,
            status: ExpensePaymentStatus.PENDING,
          },
        });
        expense.status =
          hasPending > 0 ? ExpenseStatus.PENDING : ExpenseStatus.REJECTED;
      } else {
        expense.status =
          remaining <= 0 ? ExpenseStatus.COMPLETE : ExpenseStatus.REMAINING;
      }

      await this.expenseRepository.save(expense);
    }

    return this.findById(payment.expense_id, {
      id: payment.user_id,
      role: UserRole.ADMIN,
    });
  }

  /**
   * Admin can edit all and update
   * Users are FORBIDDEN from editing
   */
  async update(
    id: string,
    updateDto: UpdateExpenseDto,
    userRole: UserRole,
  ): Promise<Expense> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(EXPENSE_USER_NOT_ALLOWED_TO_EDIT);
    }

    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: { user: true, payments: true },
    });

    if (!expense) {
      throw new NotFoundException(EXPENSE_NOT_FOUND);
    }

    const effectiveNote =
      updateDto.note ?? updateDto.description ?? updateDto.title;
    if (effectiveNote !== undefined) {
      expense.note = effectiveNote;
    }
    const effectiveAdminNote =
      updateDto.admin_note ?? updateDto.reason;
    if (effectiveAdminNote !== undefined) {
      expense.admin_note = effectiveAdminNote;
    }
    const effectiveTotal = updateDto.total_amount ?? updateDto.total;
    if (effectiveTotal !== undefined) {
      expense.total_amount = Number(effectiveTotal);
    }
    const effectivePay = updateDto.pay_amount ?? updateDto.pay;
    if (effectivePay !== undefined) {
      expense.pay_amount = Number(effectivePay);
    }
    const effectivePaid =
      updateDto.paid_amount ?? updateDto.paid ?? updateDto.amount;
    if (effectivePaid !== undefined) {
      expense.paid_amount = Number(effectivePaid);
    }

    // Auto-calculate remaining if not explicitly provided
    const effectiveRemaining =
      updateDto.remaining_amount ?? updateDto.remaining;
    if (effectiveRemaining !== undefined) {
      expense.remaining_amount = Number(effectiveRemaining);
    } else if (
      effectiveTotal !== undefined ||
      effectivePaid !== undefined
    ) {
      expense.remaining_amount = Math.max(
        0,
        Number(expense.total_amount) - Number(expense.paid_amount),
      );
    }

    // Status handling
    if (updateDto.status) {
      expense.status = updateDto.status;
    } else {
      if (
        Number(expense.remaining_amount) <= 0 &&
        Number(expense.paid_amount) > 0
      ) {
        expense.status = ExpenseStatus.COMPLETE;
      } else if (
        Number(expense.paid_amount) > 0 &&
        Number(expense.remaining_amount) > 0
      ) {
        expense.status = ExpenseStatus.REMAINING;
      }
    }

    await this.expenseRepository.save(expense);

    return this.findById(expense.id, {
      id: expense.user_id,
      role: UserRole.ADMIN,
    });
  }

  /**
   * Find single expense by ID
   * Accessible by all authenticated users and admin
   */
  async findById(
    id: string,
    currentUser?: { id: string; role: UserRole },
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: { user: true, payments: { user: true } },
      order: {
        payments: {
          created_at: 'ASC',
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(EXPENSE_NOT_FOUND);
    }

    return expense;
  }

  /**
   * List expenses with filters, search, and pagination
   * Shows all users' expenses to both regular users and Admin
   */
  async findAll(
    query: QueryExpenseDto,
    currentUser?: { id: string; role: UserRole },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<Expense> = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.user', 'user')
      .leftJoinAndSelect('expense.payments', 'payments');

    // Filter by specific user_id if requested
    if (query.user_id) {
      qb.andWhere('expense.user_id = :userId', { userId: query.user_id });
    }

    if (query.status) {
      qb.andWhere('expense.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(expense.note ILIKE :search OR user.name ILIKE :search OR user.email ILIKE :search OR user.mobile ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.startDate) {
      qb.andWhere('expense.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('expense.created_at <= :endDate', { endDate: end });
    }

    qb.orderBy('expense.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Compute summary totals for all matching records
    const summaryQb = this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoin('expense.user', 'user');

    if (query.user_id) {
      summaryQb.andWhere('expense.user_id = :userId', { userId: query.user_id });
    }

    if (query.status) {
      summaryQb.andWhere('expense.status = :status', { status: query.status });
    }

    if (query.search) {
      summaryQb.andWhere(
        '(expense.note ILIKE :search OR user.name ILIKE :search OR user.email ILIKE :search OR user.mobile ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.startDate) {
      summaryQb.andWhere('expense.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      summaryQb.andWhere('expense.created_at <= :endDate', { endDate: end });
    }

    const rawSummary = await summaryQb
      .select('SUM(expense.total_amount)', 'totalRoomRate')
      .addSelect('SUM(expense.paid_amount)', 'totalApproved')
      .addSelect('SUM(expense.remaining_amount)', 'totalRemaining')
      .addSelect(
        "SUM(CASE WHEN expense.status = 'PENDING' THEN expense.pay_amount ELSE 0 END)",
        'totalPending',
      )
      .getRawOne();

    const summary = {
      totalRoomRateAmount: Number(rawSummary?.totalRoomRate || 0),
      totalApprovedAmount: Number(rawSummary?.totalApproved || 0),
      totalPendingAmount: Number(rawSummary?.totalPending || 0),
      totalRemainingAmount: Number(rawSummary?.totalRemaining || 0),
      totalRecords: total,
    };

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      summary,
    };
  }

  /**
   * Dedicated Total List API:
   * Lists all users who requested amounts, where approved total is updated ONLY when admin approves.
   * Example:
   * user req = 5000 status pending -> total = 0
   * admin req approve -> total = 5000 status complete
   */
  async getUserTotalsList(
    currentUser: { id: string; role: UserRole },
    search?: string,
  ) {
    const userQb = this.userRepository.createQueryBuilder('user');

    // Normal users only see their own summary; Admin sees all non-admin users
    if (currentUser.role === UserRole.USER) {
      userQb.where('user.id = :userId', { userId: currentUser.id });
    } else {
      userQb.where('user.role != :adminRole', { adminRole: UserRole.ADMIN });
    }

    if (search) {
      userQb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.mobile ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    userQb.orderBy('user.name', 'ASC');
    const users = await userQb.getMany();

    if (users.length === 0) {
      return {
        users: [],
        grandSummary: {
          grandTotalRoomRate: 0,
          grandTotalApproved: 0,
          grandTotalPending: 0,
          grandTotalRemaining: 0,
          totalUsers: 0,
        },
      };
    }

    const userIds = users.map((u) => u.id);

    // Fetch all expenses and payments for these users
    const allExpenses = await this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.payments', 'payments')
      .where('expense.user_id IN (:...userIds)', { userIds })
      .orderBy('expense.created_at', 'DESC')
      .getMany();

    // Map expenses by user_id
    const expensesByUser = new Map<string, Expense[]>();
    for (const exp of allExpenses) {
      const list = expensesByUser.get(exp.user_id) || [];
      list.push(exp);
      expensesByUser.set(exp.user_id, list);
    }

    let grandTotalRoomRate = 0;
    let grandTotalApproved = 0;
    let grandTotalPending = 0;
    let grandTotalRemaining = 0;

    const userList = users.map((user) => {
      const userExpenses = expensesByUser.get(user.id) || [];

      let totalRoomRate = 0;
      let totalApproved = 0; // The "total" that changes only when admin approves!
      let totalPending = 0;
      let totalRemaining = 0;

      let pendingCount = 0;
      let remainingCount = 0;
      let completeCount = 0;
      let rejectedCount = 0;

      const requestsSummary = userExpenses.map((exp) => {
        const total = Number(exp.total_amount);
        const approved = Number(exp.paid_amount);
        const remaining = Number(exp.remaining_amount);
        const requested = Number(exp.pay_amount);

        totalRoomRate += total;
        totalApproved += approved; // Only approved counts toward total!
        totalRemaining += remaining;

        if (exp.status === ExpenseStatus.PENDING) {
          totalPending += requested;
          pendingCount++;
        } else if (exp.status === ExpenseStatus.REMAINING) {
          remainingCount++;
        } else if (exp.status === ExpenseStatus.COMPLETE) {
          completeCount++;
        } else if (exp.status === ExpenseStatus.REJECTED) {
          rejectedCount++;
        }

        return {
          id: exp.id,
          note: exp.note,
          total_amount: total,
          requested_amount: requested,
          approved_amount: approved, // 0 when pending, 5000 when approved
          remaining_amount: remaining,
          status: exp.status,
          payments: exp.payments || [],
          created_at: exp.created_at,
          updated_at: exp.updated_at,
        };
      });

      grandTotalRoomRate += totalRoomRate;
      grandTotalApproved += totalApproved;
      grandTotalPending += totalPending;
      grandTotalRemaining += totalRemaining;

      // Overall user status
      let overallStatus = 'NO_REQUESTS';
      if (userExpenses.length > 0) {
        if (remainingCount > 0 || (totalApproved > 0 && totalRemaining > 0)) {
          overallStatus = ExpenseStatus.REMAINING;
        } else if (pendingCount > 0 && totalApproved === 0) {
          overallStatus = ExpenseStatus.PENDING;
        } else if (totalApproved > 0 && totalRemaining === 0) {
          overallStatus = ExpenseStatus.COMPLETE;
        } else if (rejectedCount === userExpenses.length) {
          overallStatus = ExpenseStatus.REJECTED;
        } else {
          overallStatus = userExpenses[0]?.status || ExpenseStatus.PENDING;
        }
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          profile_picture: user.profile_picture,
        },
        // EXACT fields matching user requirement:
        total: totalApproved, // 0 when pending, 5000 when approved!
        total_amount: totalRoomRate,
        total_approved: totalApproved,
        total_pending: totalPending,
        total_remaining: totalRemaining,
        status: overallStatus,
        counts: {
          total: userExpenses.length,
          pending: pendingCount,
          remaining: remainingCount,
          complete: completeCount,
          rejected: rejectedCount,
        },
        requests: requestsSummary,
      };
    });

    return {
      users: userList,
      grandSummary: {
        grandTotalRoomRate,
        grandTotalApproved, // Changes when admin approves!
        grandTotalPending,
        grandTotalRemaining,
        totalUsers: users.length,
      },
    };
  }

  /**
   * Delete expense (Admin only)
   */
  async delete(id: string): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id } });
    if (!expense) {
      throw new NotFoundException(EXPENSE_NOT_FOUND);
    }
    await this.expenseRepository.remove(expense);
  }
}
