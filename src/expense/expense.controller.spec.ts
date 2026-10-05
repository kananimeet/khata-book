import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpenseController } from './expense.controller.js';
import { UserRole } from '../common/enums/role.enum.js';
import { ExpenseStatus } from '../common/enums/expense-status.enum.js';
import {
  EXPENSE_CREATED_SUCCESS,
  EXPENSE_PAYMENT_CREATED_SUCCESS,
  EXPENSE_APPROVED_SUCCESS,
  EXPENSE_UPDATED_SUCCESS,
  EXPENSE_TOTAL_LIST_FETCHED_SUCCESS,
  EXPENSES_FETCHED_SUCCESS,
} from '../common/message.js';

describe('ExpenseController', () => {
  let controller: ExpenseController;
  let mockExpenseService: any;

  beforeEach(() => {
    mockExpenseService = {
      create: vi.fn(),
      createPayment: vi.fn(),
      approveExpense: vi.fn(),
      rejectExpense: vi.fn(),
      approvePayment: vi.fn(),
      rejectPayment: vi.fn(),
      update: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      getUserTotalsList: vi.fn(),
      delete: vi.fn(),
    };

    controller = new ExpenseController(mockExpenseService);
  });

  it('create() should call service.create with user id and DTO', async () => {
    const dto = {
      total_amount: 6000,
      pay_amount: 5000,
      note: 'room pay',
    };
    const mockExpense = { id: 'exp-1', ...dto, status: ExpenseStatus.PENDING };
    mockExpenseService.create.mockResolvedValue(mockExpense);

    const result = await controller.create(
      { id: 'user-1', role: UserRole.USER },
      dto,
    );

    expect(mockExpenseService.create).toHaveBeenCalledWith(
      'user-1',
      dto,
      UserRole.USER,
    );
    expect(result.message).toBe(EXPENSE_CREATED_SUCCESS);
    expect(result.data).toEqual(mockExpense);
  });

  it('createPayment() should call service.createPayment for subsequent installment', async () => {
    const dto = {
      pay_amount: 1000,
      note: 'remaining 1000 pay',
    };
    const mockExpense = { id: 'exp-1', total_amount: 6000, paid_amount: 5000 };
    mockExpenseService.createPayment.mockResolvedValue(mockExpense);

    const result = await controller.createPayment(
      'exp-1',
      { id: 'user-1', role: UserRole.USER },
      dto,
    );

    expect(mockExpenseService.createPayment).toHaveBeenCalledWith(
      'exp-1',
      'user-1',
      dto,
      false,
    );
    expect(result.message).toBe(EXPENSE_PAYMENT_CREATED_SUCCESS);
  });

  it('approveExpense() should call service.approveExpense and return success', async () => {
    const mockExpense = {
      id: 'exp-1',
      status: ExpenseStatus.COMPLETE,
      paid_amount: 6000,
    };
    mockExpenseService.approveExpense.mockResolvedValue(mockExpense);

    const result = await controller.approveExpense('exp-1', {
      admin_note: 'Approved',
    });

    expect(mockExpenseService.approveExpense).toHaveBeenCalledWith('exp-1', {
      admin_note: 'Approved',
    });
    expect(result.message).toBe(EXPENSE_APPROVED_SUCCESS);
  });

  it('getUserTotalsList() should call service.getUserTotalsList and return success', async () => {
    const mockData = {
      users: [
        {
          user: { id: 'user-1', name: 'Meet' },
          total: 5000,
          status: ExpenseStatus.REMAINING,
        },
      ],
      grandSummary: { grandTotalApproved: 5000 },
    };
    mockExpenseService.getUserTotalsList.mockResolvedValue(mockData);

    const result = await controller.getUserTotalsList(
      { id: 'admin-1', role: UserRole.ADMIN },
      'Meet',
    );

    expect(mockExpenseService.getUserTotalsList).toHaveBeenCalledWith(
      { id: 'admin-1', role: UserRole.ADMIN },
      'Meet',
    );
    expect(result.message).toBe(EXPENSE_TOTAL_LIST_FETCHED_SUCCESS);
    expect(result.data).toEqual(mockData);
  });

  it('update() should call service.update and return updated expense', async () => {
    const dto = { total_amount: 7000 };
    const mockExpense = { id: 'exp-1', total_amount: 7000 };
    mockExpenseService.update.mockResolvedValue(mockExpense);

    const result = await controller.update('exp-1', dto, {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(mockExpenseService.update).toHaveBeenCalledWith(
      'exp-1',
      dto,
      UserRole.ADMIN,
    );
    expect(result.message).toBe(EXPENSE_UPDATED_SUCCESS);
  });

  it('findAll() should call service.findAll and return all expenses', async () => {
    const query = { page: 1, limit: 10 };
    const mockResult = {
      items: [
        { id: 'exp-1', total_amount: 6000, user_id: 'user-1' },
        { id: 'exp-2', total_amount: 4000, user_id: 'user-2' },
      ],
      meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      summary: {
        totalRoomRateAmount: 10000,
        totalApprovedAmount: 5000,
        totalPendingAmount: 5000,
        totalRemainingAmount: 5000,
        totalRecords: 2,
      },
    };
    mockExpenseService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll(query, {
      id: 'user-1',
      role: UserRole.USER,
    });

    expect(mockExpenseService.findAll).toHaveBeenCalledWith(query, {
      id: 'user-1',
      role: UserRole.USER,
    });
    expect(result.message).toBe(EXPENSES_FETCHED_SUCCESS);
    expect(result.data).toEqual(mockResult);
  });
});
