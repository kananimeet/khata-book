import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseService } from './expense.service.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  ExpenseStatus,
  ExpensePaymentStatus,
} from '../common/enums/expense-status.enum.js';

describe('ExpenseService', () => {
  let service: ExpenseService;
  let mockExpenseRepo: any;
  let mockPaymentRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    mockExpenseRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
      create: vi.fn((data) => ({ id: 'exp-123', ...data })),
      save: vi.fn((data) => Promise.resolve({ id: 'exp-123', ...data })),
      update: vi.fn(() => Promise.resolve({ affected: 1 })),
      remove: vi.fn(),
    };

    mockPaymentRepo = {
      findOne: vi.fn(),
      find: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(0)),
      create: vi.fn((data) => ({ id: 'pay-123', ...data })),
      save: vi.fn((data) => Promise.resolve({ id: 'pay-123', ...data })),
    };

    mockUserRepo = {
      createQueryBuilder: vi.fn(),
    };

    service = new ExpenseService(
      mockExpenseRepo,
      mockPaymentRepo,
      mockUserRepo,
    );
  });

  describe('Scenario 1: Total = 6000, Pay = 6000, note = room pay', () => {
    it('should create expense with status PENDING and remaining 0, then COMPLETE when approved', async () => {
      // 1. check for existing remaining expense -> null
      // 2. findById return after create
      mockExpenseRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'exp-123',
          user_id: 'user-1',
          total_amount: 6000,
          pay_amount: 6000,
          paid_amount: 0,
          remaining_amount: 0,
          status: ExpenseStatus.PENDING,
          note: 'room pay',
          payments: [
            {
              id: 'pay-123',
              amount: 6000,
              status: ExpensePaymentStatus.PENDING,
            },
          ],
        });

      const created = await service.create(
        'user-1',
        {
          total_amount: 6000,
          pay_amount: 6000,
          note: 'room pay',
        },
        UserRole.USER,
      );

      expect(created.total_amount).toBe(6000);
      expect(created.pay_amount).toBe(6000);
      expect(created.status).toBe(ExpenseStatus.PENDING);
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 6000,
          status: ExpensePaymentStatus.PENDING,
        }),
      );

      // Now Admin approves this request
      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 6000,
        paid_amount: 0,
        remaining_amount: 0,
        status: ExpenseStatus.PENDING,
        payments: [
          {
            id: 'pay-123',
            amount: 6000,
            status: ExpensePaymentStatus.PENDING,
          },
        ],
      });

      // findById return after approval
      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 6000,
        paid_amount: 6000,
        remaining_amount: 0,
        status: ExpenseStatus.COMPLETE,
        note: 'room pay',
      });

      const approved = await service.approveExpense('exp-123', {
        admin_note: 'Approved',
      });

      expect(approved.status).toBe(ExpenseStatus.COMPLETE);
      expect(approved.paid_amount).toBe(6000);
      expect(approved.remaining_amount).toBe(0);
    });
  });

  describe('Scenario 2: Total = 6000, Pay = 5000 (Remaining = 1000), then Pay = 1000 (Complete)', () => {
    it('should transition from PENDING -> REMAINING (1000 left) -> COMPLETE (0 left)', async () => {
      // Step 1: User creates total = 6000, pay = 5000
      mockExpenseRepo.findOne
        .mockResolvedValueOnce(null) // activeRemainingExpense check in create()
        .mockResolvedValueOnce({
          id: 'exp-123',
          user_id: 'user-1',
          total_amount: 6000,
          pay_amount: 5000,
          paid_amount: 0,
          remaining_amount: 1000,
          status: ExpenseStatus.PENDING,
          note: 'room pay',
        });

      const step1 = await service.create(
        'user-1',
        {
          total_amount: 6000,
          pay_amount: 5000,
          note: 'room pay',
        },
        UserRole.USER,
      );

      expect(step1.remaining_amount).toBe(1000);
      expect(step1.status).toBe(ExpenseStatus.PENDING);

      // Step 2: Admin approves the 5000 payment -> Status REMAINING, remaining 1000
      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 5000,
        paid_amount: 0,
        remaining_amount: 1000,
        status: ExpenseStatus.PENDING,
        payments: [
          {
            id: 'pay-1',
            amount: 5000,
            status: ExpensePaymentStatus.PENDING,
          },
        ],
      });

      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 5000,
        paid_amount: 5000,
        remaining_amount: 1000,
        status: ExpenseStatus.REMAINING,
      });

      const approved1 = await service.approveExpense('exp-123');
      expect(approved1.paid_amount).toBe(5000);
      expect(approved1.remaining_amount).toBe(1000);
      expect(approved1.status).toBe(ExpenseStatus.REMAINING);

      // Step 3: User creates second payment request of 1000
      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 5000,
        paid_amount: 5000,
        remaining_amount: 1000,
        status: ExpenseStatus.REMAINING,
      });

      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 1000,
        paid_amount: 5000,
        remaining_amount: 1000,
        status: ExpenseStatus.REMAINING,
      });

      const paymentStep = await service.createPayment('exp-123', 'user-1', {
        pay_amount: 1000,
        note: 'second request',
      });
      expect(paymentStep).toBeDefined();

      // Step 4: Admin approves the second 1000 payment -> Status COMPLETE, remaining 0
      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 1000,
        paid_amount: 5000,
        remaining_amount: 1000,
        status: ExpenseStatus.REMAINING,
        payments: [
          {
            id: 'pay-2',
            amount: 1000,
            status: ExpensePaymentStatus.PENDING,
          },
        ],
      });

      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        pay_amount: 1000,
        paid_amount: 6000,
        remaining_amount: 0,
        status: ExpenseStatus.COMPLETE,
      });

      const approved2 = await service.approveExpense('exp-123');
      expect(approved2.paid_amount).toBe(6000);
      expect(approved2.remaining_amount).toBe(0);
      expect(approved2.status).toBe(ExpenseStatus.COMPLETE);
    });

    it('should throw BadRequestException if payment exceeds remaining balance (e.g. pay 2000 when only 1000 remaining)', async () => {
      mockExpenseRepo.findOne.mockResolvedValue({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        paid_amount: 5000,
        remaining_amount: 1000,
        status: ExpenseStatus.REMAINING,
        payments: [],
      });

      await expect(
        service.createPayment('exp-123', 'user-1', {
          pay_amount: 2000, // Exceeds remaining 1000!
        }),
      ).rejects.toThrow(
        'Payment amount (2000) exceeds remaining balance. Only 1000 is remaining (only 1000 baki he)',
      );
    });
  });

  describe('Scenario 3: Permissions - User cannot edit, Admin can edit', () => {
    it('should throw ForbiddenException if user tries to update expense', async () => {
      await expect(
        service.update(
          'exp-123',
          { total_amount: 7000 },
          UserRole.USER, // Regular user
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Admin to update expense', async () => {
      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 6000,
        paid_amount: 5000,
        remaining_amount: 1000,
        status: ExpenseStatus.REMAINING,
      });

      mockExpenseRepo.findOne.mockResolvedValueOnce({
        id: 'exp-123',
        user_id: 'user-1',
        total_amount: 8000,
        paid_amount: 5000,
        remaining_amount: 3000,
        status: ExpenseStatus.REMAINING,
      });

      const updated = await service.update(
        'exp-123',
        { total_amount: 8000 },
        UserRole.ADMIN,
      );

      expect(updated.total_amount).toBe(8000);
      expect(mockExpenseRepo.save).toHaveBeenCalled();
    });
  });

  describe('Scenario 4: Total List API', () => {
    it('should show total = 0 when pending, and total = 5000 when approved', async () => {
      // Mock user query
      const mockUserQb: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          {
            id: 'user-1',
            name: 'Meet Kanani',
            email: 'meet@example.com',
            mobile: '+919876543210',
          },
        ]),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(mockUserQb);

      // 1) When user request = 5000 is PENDING:
      const mockExpenseQbPending: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          {
            id: 'exp-1',
            user_id: 'user-1',
            note: 'room pay',
            total_amount: 6000,
            pay_amount: 5000,
            paid_amount: 0, // Pending, so approved total is 0
            remaining_amount: 1000,
            status: ExpenseStatus.PENDING,
            payments: [],
          },
        ]),
      };
      mockExpenseRepo.createQueryBuilder.mockReturnValue(mockExpenseQbPending);

      const resultPending = await service.getUserTotalsList({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      expect(resultPending.users[0].total).toBe(0); // Total is 0 while pending!
      expect(resultPending.users[0].total_pending).toBe(5000);
      expect(resultPending.users[0].status).toBe(ExpenseStatus.PENDING);

      // 2) When Admin APPROVES -> total = 5000:
      const mockExpenseQbApproved: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          {
            id: 'exp-1',
            user_id: 'user-1',
            note: 'room pay',
            total_amount: 6000,
            pay_amount: 5000,
            paid_amount: 5000, // Approved, so total is now 5000!
            remaining_amount: 1000,
            status: ExpenseStatus.REMAINING,
            payments: [],
          },
        ]),
      };
      mockExpenseRepo.createQueryBuilder.mockReturnValue(mockExpenseQbApproved);

      const resultApproved = await service.getUserTotalsList({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      expect(resultApproved.users[0].total).toBe(5000); // Total changes to 5000 after admin approve!
      expect(resultApproved.users[0].total_approved).toBe(5000);
      expect(resultApproved.users[0].total_remaining).toBe(1000);
      expect(resultApproved.users[0].status).toBe(ExpenseStatus.REMAINING);
    });
  });

  describe('Scenario 5: findAll - All users and Admin can view all expenses', () => {
    it('should allow regular USER to view all expenses without restricting to user_id', async () => {
      const mockQb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [
            { id: 'exp-1', user_id: 'user-1', total_amount: 6000 },
            { id: 'exp-2', user_id: 'user-2', total_amount: 4000 },
          ],
          2,
        ]),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({
          totalRoomRate: 10000,
          totalApproved: 5000,
          totalPending: 5000,
          totalRemaining: 5000,
        }),
      };

      mockExpenseRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll(
        {},
        { id: 'user-1', role: UserRole.USER },
      );

      // Verify that user_id scoping is NOT applied to restrict regular users to their own expenses
      expect(mockQb.where).not.toHaveBeenCalledWith(
        'expense.user_id = :userId',
        expect.anything(),
      );
      expect(result.items).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.summary.totalRoomRateAmount).toBe(10000);
    });

    it('should filter by user_id when query.user_id is explicitly passed', async () => {
      const mockQb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [{ id: 'exp-2', user_id: 'user-2', total_amount: 4000 }],
          1,
        ]),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({
          totalRoomRate: 4000,
          totalApproved: 4000,
          totalPending: 0,
          totalRemaining: 0,
        }),
      };

      mockExpenseRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll(
        { user_id: 'user-2' },
        { id: 'user-1', role: UserRole.USER },
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'expense.user_id = :userId',
        { userId: 'user-2' },
      );
      expect(result.items).toHaveLength(1);
    });
  });
});
