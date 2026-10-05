import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DailyExpenseService } from './daily-expense.service.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  DailyExpenseStatus,
  DailyExpenseType,
} from '../common/enums/daily-expense.enum.js';

describe('DailyExpenseService', () => {
  let service: DailyExpenseService;
  let mockDailyExpenseRepo: any;
  let mockUserRepo: any;
  let mockExpenseService: any;

  beforeEach(() => {
    mockDailyExpenseRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
      create: vi.fn((data) => ({ id: 'daily-123', ...data })),
      save: vi.fn((data) => Promise.resolve({ id: 'daily-123', ...data })),
      remove: vi.fn(() => Promise.resolve()),
    };

    mockUserRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 'user-1', name: 'User 1' }),
    };

    mockExpenseService = {
      deductRoomRent: vi.fn(() =>
        Promise.resolve({
          adjustedExpenseId: 'exp-1',
          previousTotal: 6000,
          newTotal: 5500,
          remainingRent: 500,
        }),
      ),
    };

    service = new DailyExpenseService(
      mockDailyExpenseRepo,
      mockUserRepo,
      mockExpenseService,
    );
  });

  describe('create', () => {
    it('should create a daily room expense with status PENDING', async () => {
      mockDailyExpenseRepo.findOne.mockResolvedValue({
        id: 'daily-123',
        user_id: 'user-1',
        amount: 500,
        category: 'GROCERY',
        expense_type: DailyExpenseType.ROOM,
        status: DailyExpenseStatus.PENDING,
        note: 'Vegetables & Milk',
        payment_photo: '/uploads/daily-expenses/receipt.jpg',
        is_rent_adjusted: false,
      });

      const result = await service.create(
        'user-1',
        {
          amount: 500,
          category: 'GROCERY',
          expense_type: DailyExpenseType.ROOM,
          note: 'Vegetables & Milk',
          payment_photo: '/uploads/daily-expenses/receipt.jpg',
        },
        UserRole.USER,
      );

      expect(mockDailyExpenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          amount: 500,
          category: 'GROCERY',
          expense_type: DailyExpenseType.ROOM,
          status: DailyExpenseStatus.PENDING,
          is_rent_adjusted: false,
        }),
      );
      expect(result.id).toBe('daily-123');
    });

    it('should create an own expense for personal purchase', async () => {
      mockDailyExpenseRepo.findOne.mockResolvedValue({
        id: 'daily-456',
        user_id: 'user-1',
        amount: 200,
        category: 'MEDICINE',
        expense_type: DailyExpenseType.OWN,
        status: DailyExpenseStatus.PENDING,
      });

      const result = await service.create(
        'user-1',
        {
          amount: 200,
          category: 'MEDICINE',
          expense_type: DailyExpenseType.OWN,
        },
        UserRole.USER,
      );

      expect(mockDailyExpenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expense_type: DailyExpenseType.OWN,
          status: DailyExpenseStatus.PENDING,
        }),
      );
      expect(result.id).toBe('daily-123');
    });
  });

  describe('findAll', () => {
    it('should filter by current user id if regular user and calculate summary', async () => {
      const mockQb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          {
            id: '1',
            amount: 500,
            expense_type: DailyExpenseType.ROOM,
            status: DailyExpenseStatus.APPROVED,
          },
          {
            id: '2',
            amount: 300,
            expense_type: DailyExpenseType.OWN,
            status: DailyExpenseStatus.PENDING,
          },
        ]),
        getRawOne: vi.fn().mockResolvedValue({
          totalCount: '2',
          totalAmount: '800',
          totalRoomAmount: '500',
          totalOwnAmount: '300',
          pendingCount: '1',
          approvedCount: '1',
          rejectedCount: '0',
        }),
      };
      mockDailyExpenseRepo.createQueryBuilder.mockReturnValue(mockQb);

      const res = await service.findAll(
        { page: 1, limit: 10, user_id: 'user-1' },
        { id: 'user-1', role: UserRole.USER },
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'daily.user_id = :filterUserId',
        { filterUserId: 'user-1' },
      );
      expect(res.summary.totalAmount).toBe(800);
      expect(res.summary.totalRoomAmount).toBe(500);
      expect(res.summary.totalOwnAmount).toBe(300);
      expect(res.summary.pendingCount).toBe(1);
      expect(res.summary.approvedCount).toBe(1);
    });
  });

  describe('update permissions', () => {
    it('should allow user to update their own PENDING expense', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-1',
        amount: 500,
        category: 'GROCERY',
        status: DailyExpenseStatus.PENDING,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      const res = await service.update(
        'daily-1',
        { amount: 600, note: 'Updated note' },
        { id: 'user-1', role: UserRole.USER },
      );

      expect(mockDailyExpenseRepo.save).toHaveBeenCalled();
      expect(existing.amount).toBe(600);
    });

    it('should forbid user from updating another user expense', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-2',
        status: DailyExpenseStatus.PENDING,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update(
          'daily-1',
          { amount: 600 },
          { id: 'user-1', role: UserRole.USER },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should disallow user from updating if status is APPROVED or REJECTED', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-1',
        status: DailyExpenseStatus.APPROVED,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.update(
          'daily-1',
          { amount: 600 },
          { id: 'user-1', role: UserRole.USER },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to update any expense even if not pending', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-1',
        status: DailyExpenseStatus.APPROVED,
        amount: 500,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      await service.update(
        'daily-1',
        { amount: 700, admin_note: 'Admin corrected amount' },
        { id: 'admin-1', role: UserRole.ADMIN },
      );

      expect(existing.amount).toBe(700);
      expect(existing.admin_note).toBe('Admin corrected amount');
    });
  });

  describe('approve', () => {
    it('should decrease room rent when ROOM expense is approved by admin', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-1',
        amount: 500,
        category: 'GROCERY',
        note: 'Vegetables',
        expense_type: DailyExpenseType.ROOM,
        status: DailyExpenseStatus.PENDING,
        is_rent_adjusted: false,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      const approved = await service.approve('daily-1', {
        admin_note: 'Bill verified',
      });

      expect(approved.status).toBe(DailyExpenseStatus.APPROVED);
      expect(approved.is_rent_adjusted).toBe(true);
      expect(approved.rent_adjusted_amount).toBe(500);
      expect(mockExpenseService.deductRoomRent).toHaveBeenCalledWith(
        'user-1',
        500,
        expect.stringContaining('Daily room expense: GROCERY'),
      );
    });

    it('should NOT decrease room rent when OWN expense is approved', async () => {
      const existing = {
        id: 'daily-2',
        user_id: 'user-1',
        amount: 200,
        category: 'MEDICINE',
        expense_type: DailyExpenseType.OWN,
        status: DailyExpenseStatus.PENDING,
        is_rent_adjusted: false,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      const approved = await service.approve('daily-2', {
        admin_note: 'Personal reimbursement approved',
      });

      expect(approved.status).toBe(DailyExpenseStatus.APPROVED);
      expect(approved.is_rent_adjusted).toBe(false);
      expect(mockExpenseService.deductRoomRent).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should allow user to delete their own pending expense', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-1',
        status: DailyExpenseStatus.PENDING,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      await service.delete('daily-1', { id: 'user-1', role: UserRole.USER });
      expect(mockDailyExpenseRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('should not allow user to delete if already approved', async () => {
      const existing = {
        id: 'daily-1',
        user_id: 'user-1',
        status: DailyExpenseStatus.APPROVED,
      };
      mockDailyExpenseRepo.findOne.mockResolvedValue(existing);

      await expect(
        service.delete('daily-1', { id: 'user-1', role: UserRole.USER }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getChartData', () => {
    it('should aggregate daily and monthly trends and category breakdown', async () => {
      const mockExpenses = [
        {
          id: '1',
          amount: 500,
          expense_type: DailyExpenseType.ROOM,
          status: DailyExpenseStatus.APPROVED,
          category: 'GROCERY',
          expense_date: new Date('2026-10-04T10:00:00Z'),
        },
        {
          id: '2',
          amount: 200,
          expense_type: DailyExpenseType.OWN,
          status: DailyExpenseStatus.PENDING,
          category: 'Vakil/Masi',
          expense_date: new Date('2026-10-04T12:00:00Z'),
        },
        {
          id: '3',
          amount: 300,
          expense_type: DailyExpenseType.ROOM,
          status: DailyExpenseStatus.APPROVED,
          category: 'GROCERY',
          expense_date: new Date('2026-05-15T10:00:00Z'),
        },
      ];

      const mockQb: any = {
        select: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockExpenses),
      };
      mockDailyExpenseRepo.createQueryBuilder.mockReturnValue(mockQb);

      const res = await service.getChartData(
        { year: 2026, month: 10 },
        { id: 'user-1', role: UserRole.USER },
      );

      expect(res.selectedYear).toBe(2026);
      expect(res.selectedMonth).toBe(10);
      expect(res.summary.totalAmount).toBe(1000);
      expect(res.summary.roomAmount).toBe(800);
      expect(res.summary.ownAmount).toBe(200);
      expect(res.summary.thisMonthAmount).toBe(700);

      // Monthly Trend (12 months)
      expect(res.monthlyTrend.length).toBe(12);
      expect(res.monthlyTrend[9].month).toBe(10); // Oct
      expect(res.monthlyTrend[9].total).toBe(700);
      expect(res.monthlyTrend[4].month).toBe(5); // May
      expect(res.monthlyTrend[4].total).toBe(300);

      // Daily Trend (31 days in Oct)
      expect(res.dailyTrend.length).toBe(31);
      expect(res.dailyTrend[3].day).toBe(4);
      expect(res.dailyTrend[3].total).toBe(700);

      // Category breakdown
      expect(res.categoryBreakdown.length).toBe(2);
      expect(res.categoryBreakdown[0].category).toBe('GROCERY');
      expect(res.categoryBreakdown[0].total).toBe(800);
      expect(res.categoryBreakdown[1].category).toBe('Vakil/Masi');
      expect(res.categoryBreakdown[1].total).toBe(200);
    });
  });
});
