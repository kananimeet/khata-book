import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyExpenseController } from './daily-expense.controller.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  DailyExpenseStatus,
  DailyExpenseType,
} from '../common/enums/daily-expense.enum.js';
import {
  DAILY_EXPENSE_CREATED_SUCCESS,
  DAILY_EXPENSE_APPROVED_SUCCESS,
  DAILY_EXPENSE_REJECTED_SUCCESS,
  DAILY_EXPENSE_UPDATED_SUCCESS,
  DAILY_EXPENSES_FETCHED_SUCCESS,
  DAILY_EXPENSE_DELETED_SUCCESS,
  DAILY_EXPENSE_CHART_FETCHED_SUCCESS,
} from '../common/message.js';

describe('DailyExpenseController', () => {
  let controller: DailyExpenseController;
  let mockDailyExpenseService: any;

  beforeEach(() => {
    mockDailyExpenseService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      delete: vi.fn(),
    };

    controller = new DailyExpenseController(mockDailyExpenseService);
  });

  it('create() should call service.create with user id and DTO', async () => {
    const dto = {
      amount: 450,
      category: 'GROCERY',
      expense_type: DailyExpenseType.ROOM,
      note: 'Grocery purchase',
    };
    const mockCreated = {
      id: 'daily-1',
      ...dto,
      status: DailyExpenseStatus.PENDING,
    };
    mockDailyExpenseService.create.mockResolvedValue(mockCreated);

    const result = await controller.create(
      { id: 'user-1', role: UserRole.USER },
      dto,
    );

    expect(mockDailyExpenseService.create).toHaveBeenCalledWith(
      'user-1',
      dto,
      UserRole.USER,
    );
    expect(result.message).toBe(DAILY_EXPENSE_CREATED_SUCCESS);
    expect(result.data).toEqual(mockCreated);
  });

  it('findAll() should call service.findAll with query and currentUser', async () => {
    const query = { page: 1, limit: 10 };
    const mockList = {
      items: [{ id: 'daily-1', amount: 450 }],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      summary: { totalAmount: 450 },
    };
    mockDailyExpenseService.findAll.mockResolvedValue(mockList);

    const result = await controller.findAll(query, {
      id: 'user-1',
      role: UserRole.USER,
    });

    expect(mockDailyExpenseService.findAll).toHaveBeenCalledWith(query, {
      id: 'user-1',
      role: UserRole.USER,
    });
    expect(result.message).toBe(DAILY_EXPENSES_FETCHED_SUCCESS);
    expect(result.data).toEqual(mockList);
  });

  it('approve() should call service.approve and return success', async () => {
    const mockApproved = {
      id: 'daily-1',
      status: DailyExpenseStatus.APPROVED,
      is_rent_adjusted: true,
    };
    mockDailyExpenseService.approve.mockResolvedValue(mockApproved);

    const result = await controller.approve('daily-1', {
      admin_note: 'Approved',
    });

    expect(mockDailyExpenseService.approve).toHaveBeenCalledWith('daily-1', {
      admin_note: 'Approved',
    });
    expect(result.message).toBe(DAILY_EXPENSE_APPROVED_SUCCESS);
    expect(result.data).toEqual(mockApproved);
  });

  it('reject() should call service.reject and return success', async () => {
    const mockRejected = {
      id: 'daily-1',
      status: DailyExpenseStatus.REJECTED,
      admin_note: 'Invalid receipt',
    };
    mockDailyExpenseService.reject.mockResolvedValue(mockRejected);

    const result = await controller.reject('daily-1', {
      admin_note: 'Invalid receipt',
    });

    expect(mockDailyExpenseService.reject).toHaveBeenCalledWith('daily-1', {
      admin_note: 'Invalid receipt',
    });
    expect(result.message).toBe(DAILY_EXPENSE_REJECTED_SUCCESS);
  });

  it('update() should call service.update and return updated expense', async () => {
    const dto = { amount: 500 };
    const mockUpdated = { id: 'daily-1', amount: 500 };
    mockDailyExpenseService.update.mockResolvedValue(mockUpdated);

    const result = await controller.update(
      'daily-1',
      { id: 'user-1', role: UserRole.USER },
      dto,
    );

    expect(mockDailyExpenseService.update).toHaveBeenCalledWith(
      'daily-1',
      dto,
      { id: 'user-1', role: UserRole.USER },
    );
    expect(result.message).toBe(DAILY_EXPENSE_UPDATED_SUCCESS);
  });

  it('delete() should call service.delete and return success', async () => {
    mockDailyExpenseService.delete.mockResolvedValue(undefined);

    const result = await controller.delete('daily-1', {
      id: 'user-1',
      role: UserRole.USER,
    });

    expect(mockDailyExpenseService.delete).toHaveBeenCalledWith('daily-1', {
      id: 'user-1',
      role: UserRole.USER,
    });
    expect(result.message).toBe(DAILY_EXPENSE_DELETED_SUCCESS);
  });

  it('getChartData() should call service.getChartData and return success', async () => {
    mockDailyExpenseService.getChartData = vi.fn().mockResolvedValue({
      selectedYear: 2026,
      selectedMonth: 10,
      summary: { totalAmount: 1000 },
      dailyTrend: [],
      monthlyTrend: [],
      categoryBreakdown: [],
    });

    const result = await controller.getChartData(
      { year: 2026, month: 10 },
      { id: 'user-1', role: UserRole.USER },
    );

    expect(mockDailyExpenseService.getChartData).toHaveBeenCalledWith(
      { year: 2026, month: 10 },
      { id: 'user-1', role: UserRole.USER },
    );
    expect(result.message).toBe(DAILY_EXPENSE_CHART_FETCHED_SUCCESS);
    expect(result.data.summary.totalAmount).toBe(1000);
  });
});

