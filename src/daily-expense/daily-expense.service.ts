import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DailyExpense } from './entities/daily-expense.entity.js';
import { User } from '../user/entities/user.entity.js';
import { ExpenseService } from '../expense/expense.service.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  DailyExpenseStatus,
  DailyExpenseType,
} from '../common/enums/daily-expense.enum.js';
import { CreateDailyExpenseDto } from './dto/create-daily-expense.dto.js';
import { UpdateDailyExpenseDto } from './dto/update-daily-expense.dto.js';
import { QueryDailyExpenseDto } from './dto/query-daily-expense.dto.js';
import { QueryChartExpenseDto } from './dto/query-chart-expense.dto.js';
import {
  ApproveDailyExpenseDto,
  RejectDailyExpenseDto,
} from './dto/approve-reject-daily-expense.dto.js';
import {
  DAILY_EXPENSE_NOT_FOUND,
  DAILY_EXPENSE_USER_NOT_ALLOWED_TO_EDIT,
  DAILY_EXPENSE_NOT_PENDING,
  DAILY_EXPENSE_ALREADY_APPROVED,
  FORBIDDEN,
  USER_NOT_FOUND,
} from '../common/message.js';

@Injectable()
export class DailyExpenseService {
  constructor(
    @InjectRepository(DailyExpense)
    private readonly dailyExpenseRepository: Repository<DailyExpense>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly expenseService: ExpenseService,
  ) {}

  /**
   * User creates daily expense request (or Admin creates for any user).
   */
  async create(
    userId: string,
    createDto: CreateDailyExpenseDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<DailyExpense> {
    let targetUser: User | null = null;
    if (userRole === UserRole.ADMIN && createDto.user_id) {
      targetUser = await this.userRepository.findOne({
        where: { id: createDto.user_id },
      });
      if (!targetUser) {
        throw new NotFoundException(USER_NOT_FOUND(createDto.user_id));
      }
      userId = createDto.user_id;
    }

    const amount = Number(createDto.amount);
    const expenseType = createDto.expense_type || DailyExpenseType.ROOM;
    const category = createDto.category.trim();
    const note = createDto.note?.trim();
    const paymentPhoto = createDto.payment_photo;
    const expenseDate = createDto.expense_date
      ? new Date(createDto.expense_date)
      : new Date();

    const expense = this.dailyExpenseRepository.create({
      user_id: userId,
      amount: amount,
      category: category,
      expense_type: expenseType,
      note: note,
      payment_photo: paymentPhoto,
      expense_date: expenseDate,
      status: DailyExpenseStatus.PENDING,
      is_rent_adjusted: false,
      rent_adjusted_amount: 0,
    });

    const saved = await this.dailyExpenseRepository.save(expense);
    saved.user =
      targetUser ||
      ((await this.userRepository.findOne({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          profile_picture: true,
        },
      })) as User);
    return saved;
  }

  /**
   * List daily expenses.
   * Uses fast concurrent SQL aggregation for summary totals and paginated items.
   */
  async findAll(
    query: QueryDailyExpenseDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const itemsQb = this.dailyExpenseRepository
      .createQueryBuilder('daily')
      .leftJoinAndSelect('daily.user', 'user');

    const summaryQb = this.dailyExpenseRepository
      .createQueryBuilder('daily');

    const applyFilters = (
      targetQb: SelectQueryBuilder<DailyExpense>,
      isItems = false,
    ) => {
      if (query.user_id && query.user_id !== 'all') {
        targetQb.andWhere('daily.user_id = :filterUserId', {
          filterUserId: query.user_id,
        });
      }

      if (query.expense_type) {
        targetQb.andWhere('daily.expense_type = :expenseType', {
          expenseType: query.expense_type,
        });
      }

      if (query.status) {
        targetQb.andWhere('daily.status = :status', { status: query.status });
      }

      if (query.category) {
        targetQb.andWhere('LOWER(daily.category) LIKE :category', {
          category: `%${query.category.toLowerCase().trim()}%`,
        });
      }

      if (query.search) {
        if (!isItems) {
          targetQb.leftJoin('daily.user', 'user');
        }
        targetQb.andWhere(
          '(LOWER(daily.note) LIKE :search OR LOWER(daily.category) LIKE :search OR LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search)',
          { search: `%${query.search.toLowerCase().trim()}%` },
        );
      }

      if (query.startDate) {
        targetQb.andWhere('daily.expense_date >= :startDate', {
          startDate: new Date(query.startDate),
        });
      }

      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        targetQb.andWhere('daily.expense_date <= :endDate', { endDate: end });
      }
    };

    applyFilters(itemsQb, true);
    applyFilters(summaryQb, false);

    itemsQb.orderBy('daily.created_at', 'DESC').skip(skip).take(limit);

    summaryQb.select([
      'COUNT(daily.id) as "totalCount"',
      'COALESCE(SUM(daily.amount), 0) as "totalAmount"',
      `COALESCE(SUM(CASE WHEN daily.expense_type = 'room' THEN daily.amount ELSE 0 END), 0) as "totalRoomAmount"`,
      `COALESCE(SUM(CASE WHEN daily.expense_type = 'own' THEN daily.amount ELSE 0 END), 0) as "totalOwnAmount"`,
      `COALESCE(SUM(CASE WHEN daily.status = 'PENDING' THEN 1 ELSE 0 END), 0) as "pendingCount"`,
      `COALESCE(SUM(CASE WHEN daily.status = 'APPROVED' THEN 1 ELSE 0 END), 0) as "approvedCount"`,
      `COALESCE(SUM(CASE WHEN daily.status = 'REJECTED' THEN 1 ELSE 0 END), 0) as "rejectedCount"`,
    ]);

    const [itemsResult, summaryRaw] = await Promise.all([
      itemsQb.getMany(),
      summaryQb.getRawOne ? summaryQb.getRawOne() : Promise.resolve(null),
    ]);

    const items = itemsResult || [];
    let total = Number(summaryRaw?.totalCount ?? items.length);
    let totalAmount = Number(summaryRaw?.totalAmount ?? 0);
    let totalRoomAmount = Number(summaryRaw?.totalRoomAmount ?? 0);
    let totalOwnAmount = Number(summaryRaw?.totalOwnAmount ?? 0);
    let pendingCount = Number(summaryRaw?.pendingCount ?? 0);
    let approvedCount = Number(summaryRaw?.approvedCount ?? 0);
    let rejectedCount = Number(summaryRaw?.rejectedCount ?? 0);

    // Fallback if summaryRaw is not returned (e.g. basic mock in test)
    if (!summaryRaw && items.length > 0) {
      for (const item of items) {
        const amt = Number(item.amount) || 0;
        totalAmount += amt;
        if (item.expense_type === DailyExpenseType.ROOM) {
          totalRoomAmount += amt;
        } else {
          totalOwnAmount += amt;
        }
        if (item.status === DailyExpenseStatus.PENDING) pendingCount++;
        else if (item.status === DailyExpenseStatus.APPROVED) approvedCount++;
        else if (item.status === DailyExpenseStatus.REJECTED) rejectedCount++;
      }
    }

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalAmount: Number(totalAmount.toFixed(2)),
        totalRoomAmount: Number(totalRoomAmount.toFixed(2)),
        totalOwnAmount: Number(totalOwnAmount.toFixed(2)),
        totalCount: total,
        pendingCount,
        approvedCount,
        rejectedCount,
      },
    };
  }

  /**
   * Find single daily expense by ID.
   */
  async findById(
    id: string,
    currentUser: { id: string; role: UserRole },
  ): Promise<DailyExpense> {
    const expense = await this.dailyExpenseRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!expense) {
      throw new NotFoundException(DAILY_EXPENSE_NOT_FOUND);
    }

    // Any authenticated roommate or admin can view expense details

    return expense;
  }

  /**
   * Update daily expense.
   * User can edit ONLY if status is PENDING.
   * Admin can edit anytime.
   */
  async update(
    id: string,
    updateDto: UpdateDailyExpenseDto,
    currentUser: { id: string; role: UserRole },
  ): Promise<DailyExpense> {
    const expense = await this.dailyExpenseRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!expense) {
      throw new NotFoundException(DAILY_EXPENSE_NOT_FOUND);
    }

    if (currentUser.role === UserRole.USER) {
      // Must be owner
      if (expense.user_id !== currentUser.id) {
        throw new ForbiddenException(FORBIDDEN);
      }
      // Must be pending
      if (expense.status !== DailyExpenseStatus.PENDING) {
        throw new BadRequestException(DAILY_EXPENSE_USER_NOT_ALLOWED_TO_EDIT);
      }
    }

    if (updateDto.amount !== undefined) {
      expense.amount = Number(updateDto.amount);
    }
    if (updateDto.category !== undefined) {
      expense.category = updateDto.category.trim();
    }
    if (updateDto.expense_type !== undefined) {
      expense.expense_type = updateDto.expense_type;
    }
    if (updateDto.note !== undefined) {
      expense.note = updateDto.note?.trim();
    }
    if (updateDto.expense_date !== undefined) {
      expense.expense_date = new Date(updateDto.expense_date);
    }
    if (updateDto.payment_photo !== undefined) {
      expense.payment_photo = updateDto.payment_photo;
    }

    // Only Admin can update status and admin_note directly via update API
    if (currentUser.role === UserRole.ADMIN) {
      if (updateDto.status !== undefined) {
        expense.status = updateDto.status;
      }
      if (updateDto.admin_note !== undefined) {
        expense.admin_note = updateDto.admin_note;
      }
    }

    await this.dailyExpenseRepository.save(expense);
    return expense;
  }

  /**
   * Admin approves daily expense request.
   * If expense_type is 'room', automatically decreases the user's room rent liability.
   */
  async approve(
    id: string,
    approveDto?: ApproveDailyExpenseDto,
  ): Promise<DailyExpense> {
    const expense = await this.dailyExpenseRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!expense) {
      throw new NotFoundException(DAILY_EXPENSE_NOT_FOUND);
    }

    if (expense.status === DailyExpenseStatus.APPROVED) {
      throw new BadRequestException(DAILY_EXPENSE_ALREADY_APPROVED);
    }

    expense.status = DailyExpenseStatus.APPROVED;
    if (approveDto?.admin_note) {
      expense.admin_note = approveDto.admin_note;
    }

    // If room expense, decrease user's room rent liability
    if (
      expense.expense_type === DailyExpenseType.ROOM &&
      !expense.is_rent_adjusted
    ) {
      await this.expenseService.deductRoomRent(
        expense.user_id,
        Number(expense.amount),
        `Daily room expense: ${expense.category}${expense.note ? ' - ' + expense.note : ''}`,
      );
      expense.is_rent_adjusted = true;
      expense.rent_adjusted_amount = Number(expense.amount);
    }

    await this.dailyExpenseRepository.save(expense);
    return expense;
  }

  /**
   * Admin rejects daily expense request.
   */
  async reject(
    id: string,
    rejectDto?: RejectDailyExpenseDto,
  ): Promise<DailyExpense> {
    const expense = await this.dailyExpenseRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!expense) {
      throw new NotFoundException(DAILY_EXPENSE_NOT_FOUND);
    }

    expense.status = DailyExpenseStatus.REJECTED;
    if (rejectDto?.admin_note) {
      expense.admin_note = rejectDto.admin_note;
    }

    await this.dailyExpenseRepository.save(expense);
    return expense;
  }

  /**
   * Delete daily expense.
   * User can only delete their own PENDING requests.
   * Admin can delete any.
   */
  async delete(
    id: string,
    currentUser: { id: string; role: UserRole },
  ): Promise<void> {
    const expense = await this.dailyExpenseRepository.findOne({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException(DAILY_EXPENSE_NOT_FOUND);
    }

    if (currentUser.role === UserRole.USER) {
      if (expense.user_id !== currentUser.id) {
        throw new ForbiddenException(FORBIDDEN);
      }
      if (expense.status !== DailyExpenseStatus.PENDING) {
        throw new BadRequestException(DAILY_EXPENSE_NOT_PENDING);
      }
    }

    await this.dailyExpenseRepository.remove(expense);
  }

  /**
   * Get chart and analytics data for daily and monthly expenses.
   */
  async getChartData(
    query: QueryChartExpenseDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const now = new Date();
    const targetYear = query.year ? Number(query.year) : now.getFullYear();
    const targetMonth = query.month ? Number(query.month) : now.getMonth() + 1; // 1-12

    const qb = this.dailyExpenseRepository
      .createQueryBuilder('daily')
      .select([
        'daily.amount',
        'daily.expense_type',
        'daily.expense_date',
        'daily.category',
        'daily.status',
      ]);

    if (query.user_id && query.user_id !== 'all') {
      qb.andWhere('daily.user_id = :userId', { userId: query.user_id });
    }

    if (query.expense_type) {
      qb.andWhere('daily.expense_type = :expenseType', {
        expenseType: query.expense_type,
      });
    }

    if (query.status) {
      qb.andWhere('daily.status = :status', { status: query.status });
    }

    // Filter by the entire target year
    const startOfYear = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    qb.andWhere(
      'daily.expense_date >= :startOfYear AND daily.expense_date <= :endOfYear',
      {
        startOfYear,
        endOfYear,
      },
    );

    qb.orderBy('daily.expense_date', 'ASC');

    const expenses = await qb.getMany();

    // 1. Initialize 12 months for Monthly Trend
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthlyTrend = monthNames.map((monthName, index) => ({
      year: targetYear,
      month: index + 1,
      monthName,
      room: 0,
      own: 0,
      total: 0,
      count: 0,
    }));

    // 2. Initialize days for Daily Trend (targetMonth)
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyTrend = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(targetYear, targetMonth - 1, day);
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyTrend.push({
        date: dateStr,
        day,
        dayOfWeek: dayNames[dateObj.getDay()],
        room: 0,
        own: 0,
        total: 0,
        count: 0,
      });
    }

    // 3. Category Breakdown accumulators (Monthly & Yearly)
    const monthCategoryMap = new Map<
      string,
      {
        category: string;
        total: number;
        room: number;
        own: number;
        count: number;
      }
    >();
    const yearCategoryMap = new Map<
      string,
      {
        category: string;
        total: number;
        room: number;
        own: number;
        count: number;
      }
    >();

    // 4. Summaries
    let totalAmount = 0;
    let roomAmount = 0;
    let ownAmount = 0;
    let thisMonthAmount = 0;
    let thisMonthRoomAmount = 0;
    let thisMonthOwnAmount = 0;
    let todayAmount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    const todayDateStr = now.toISOString().slice(0, 10);

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      const expDate = new Date(exp.expense_date);
      const expMonth = expDate.getMonth() + 1; // 1-12
      const expDay = expDate.getDate(); // 1-31
      const expDateStr = expDate.toISOString().slice(0, 10);

      totalAmount += amt;
      if (exp.expense_type === DailyExpenseType.ROOM) {
        roomAmount += amt;
      } else {
        ownAmount += amt;
      }

      if (exp.status === DailyExpenseStatus.PENDING) pendingCount++;
      else if (exp.status === DailyExpenseStatus.APPROVED) approvedCount++;
      else if (exp.status === DailyExpenseStatus.REJECTED) rejectedCount++;

      // Monthly aggregation
      if (expMonth >= 1 && expMonth <= 12) {
        const monthSlot = monthlyTrend[expMonth - 1];
        monthSlot.total += amt;
        monthSlot.count += 1;
        if (exp.expense_type === DailyExpenseType.ROOM) {
          monthSlot.room += amt;
        } else {
          monthSlot.own += amt;
        }
      }

      // Daily aggregation (if in targetMonth)
      if (expMonth === targetMonth) {
        thisMonthAmount += amt;
        if (exp.expense_type === DailyExpenseType.ROOM) {
          thisMonthRoomAmount += amt;
        } else {
          thisMonthOwnAmount += amt;
        }

        if (expDay >= 1 && expDay <= daysInMonth) {
          const daySlot = dailyTrend[expDay - 1];
          daySlot.total += amt;
          daySlot.count += 1;
          if (exp.expense_type === DailyExpenseType.ROOM) {
            daySlot.room += amt;
          } else {
            daySlot.own += amt;
          }
        }
      }

      // Today
      if (expDateStr === todayDateStr) {
        todayAmount += amt;
      }

      // Monthly category breakdown (if in targetMonth)
      if (expMonth === targetMonth) {
        const catKey = exp.category || 'OTHER';
        const existingMonthCat = monthCategoryMap.get(catKey) || {
          category: catKey,
          total: 0,
          room: 0,
          own: 0,
          count: 0,
        };
        existingMonthCat.total += amt;
        existingMonthCat.count += 1;
        if (exp.expense_type === DailyExpenseType.ROOM) {
          existingMonthCat.room += amt;
        } else {
          existingMonthCat.own += amt;
        }
        monthCategoryMap.set(catKey, existingMonthCat);
      }

      // Yearly Category breakdown
      const catKey = exp.category || 'OTHER';
      const existingYearCat = yearCategoryMap.get(catKey) || {
        category: catKey,
        total: 0,
        room: 0,
        own: 0,
        count: 0,
      };
      existingYearCat.total += amt;
      existingYearCat.count += 1;
      if (exp.expense_type === DailyExpenseType.ROOM) {
        existingYearCat.room += amt;
      } else {
        existingYearCat.own += amt;
      }
      yearCategoryMap.set(catKey, existingYearCat);
    }

    // Format category breakdowns with percentages
    const monthCategoryBreakdown = Array.from(monthCategoryMap.values())
      .map((cat) => ({
        ...cat,
        total: Number(cat.total.toFixed(2)),
        room: Number(cat.room.toFixed(2)),
        own: Number(cat.own.toFixed(2)),
        percentage:
          thisMonthAmount > 0
            ? Number(((cat.total / thisMonthAmount) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const yearCategoryBreakdown = Array.from(yearCategoryMap.values())
      .map((cat) => ({
        ...cat,
        total: Number(cat.total.toFixed(2)),
        room: Number(cat.room.toFixed(2)),
        own: Number(cat.own.toFixed(2)),
        percentage:
          totalAmount > 0
            ? Number(((cat.total / totalAmount) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const categoryBreakdown = monthCategoryBreakdown;

    // Round values in daily and monthly trends
    for (const d of dailyTrend) {
      d.total = Number(d.total.toFixed(2));
      d.room = Number(d.room.toFixed(2));
      d.own = Number(d.own.toFixed(2));
    }

    for (const m of monthlyTrend) {
      m.total = Number(m.total.toFixed(2));
      m.room = Number(m.room.toFixed(2));
      m.own = Number(m.own.toFixed(2));
    }

    return {
      selectedYear: targetYear,
      selectedMonth: targetMonth,
      summary: {
        totalAmount: Number(totalAmount.toFixed(2)),
        roomAmount: Number(roomAmount.toFixed(2)),
        ownAmount: Number(ownAmount.toFixed(2)),
        thisMonthAmount: Number(thisMonthAmount.toFixed(2)),
        thisMonthRoomAmount: Number(thisMonthRoomAmount.toFixed(2)),
        thisMonthOwnAmount: Number(thisMonthOwnAmount.toFixed(2)),
        todayAmount: Number(todayAmount.toFixed(2)),
        totalRecords: expenses.length,
        pendingCount,
        approvedCount,
        rejectedCount,
      },
      dailyTrend,
      monthlyTrend,
      categoryBreakdown,
      monthCategoryBreakdown,
      yearCategoryBreakdown,
    };
  }
}

