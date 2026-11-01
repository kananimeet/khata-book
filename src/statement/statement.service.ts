import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpensePayment } from '../expense/entities/expense-payment.entity.js';
import { Expense } from '../expense/entities/expense.entity.js';
import { DailyExpense } from '../daily-expense/entities/daily-expense.entity.js';
import { ExpensePaymentStatus } from '../common/enums/expense-status.enum.js';
import {
  DailyExpenseType,
  DailyExpenseStatus,
} from '../common/enums/daily-expense.enum.js';
import {
  QueryStatementDto,
  StatementTypeFilter,
} from './dto/query-statement.dto.js';

export interface StatementEntry {
  id: string;
  date: string;
  time: string;
  rawDate: Date;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance: number;
  category: string;
  note: string;
  user: {
    id: string;
    name: string;
    email: string;
    profile_picture?: string;
  };
  payment_photo?: string;
  referenceId: string;
  referenceType: 'ROOM_RENT_PAYMENT' | 'DAILY_ROOM_EXPENSE';
}

@Injectable()
export class StatementService {
  private readonly logger = new Logger(StatementService.name);

  constructor(
    @InjectRepository(ExpensePayment)
    private readonly paymentRepository: Repository<ExpensePayment>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(DailyExpense)
    private readonly dailyExpenseRepository: Repository<DailyExpense>,
  ) {}

  async getStatement(query: QueryStatementDto) {
    // 1. Fetch all approved room rent credits
    const approvedPayments = await this.paymentRepository.find({
      where: { status: ExpensePaymentStatus.APPROVED },
      relations: { user: true, expense: true },
      order: { created_at: 'ASC' },
    });

    const creditEntries: StatementEntry[] = approvedPayments.map((p) => {
      const d = p.created_at ? new Date(p.created_at) : new Date();
      return {
        id: `cr-${p.id}`,
        date: d.toISOString(),
        time: d.toISOString(),
        rawDate: d,
        type: 'CREDIT',
        amount: Number(p.amount) || 0,
        balance: 0,
        category: 'Room Rent',
        note: (p.note || p.expense?.note || 'Room Rent Payment').trim(),
        user: {
          id: p.user?.id || p.user_id,
          name: p.user?.name || 'Member',
          email: p.user?.email || '',
          profile_picture: p.user?.profile_picture,
        },
        referenceId: p.id,
        referenceType: 'ROOM_RENT_PAYMENT',
      };
    });

    // 2. Fetch all approved room daily expense debits
    const approvedDailyExpenses = await this.dailyExpenseRepository.find({
      where: {
        expense_type: DailyExpenseType.ROOM,
        status: DailyExpenseStatus.APPROVED,
      },
      relations: { user: true },
      order: { expense_date: 'ASC', created_at: 'ASC' },
    });

    const debitEntries: StatementEntry[] = approvedDailyExpenses.map((e) => {
      // Use created_at timestamp for exact time if available, or expense_date
      const d = e.created_at
        ? new Date(e.created_at)
        : e.expense_date
          ? new Date(e.expense_date)
          : new Date();

      return {
        id: `dr-${e.id}`,
        date: d.toISOString(),
        time: d.toISOString(),
        rawDate: d,
        type: 'DEBIT',
        amount: Number(e.amount) || 0,
        balance: 0,
        category: e.category || 'Groceries',
        note: (e.note || e.category || 'Room Expense').trim(),
        user: {
          id: e.user?.id || e.user_id,
          name: e.user?.name || 'Roommate',
          email: e.user?.email || '',
          profile_picture: e.user?.profile_picture,
        },
        payment_photo: e.payment_photo,
        referenceId: e.id,
        referenceType: 'DAILY_ROOM_EXPENSE',
      };
    });

    // 3. Merge and sort chronologically (oldest to newest) to compute exact running balance
    const allChronological = [...creditEntries, ...debitEntries].sort(
      (a, b) => a.rawDate.getTime() - b.rawDate.getTime(),
    );

    let runningBalance = 0;
    for (const entry of allChronological) {
      if (entry.type === 'CREDIT') {
        runningBalance += entry.amount;
      } else {
        runningBalance -= entry.amount;
      }
      entry.balance = Math.round(runningBalance * 100) / 100;
    }

    // 4. Date range determination
    let fromTime: number | null = null;
    let toTime: number | null = null;

    if (query.year && query.month) {
      const y = Number(query.year);
      const m = Number(query.month) - 1; // 0-indexed
      fromTime = new Date(Date.UTC(y, m, 1, 0, 0, 0)).getTime();
      const lastDay = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).getTime();
      toTime = lastDay;
    } else {
      if (query.startDate) {
        fromTime = new Date(query.startDate).setHours(0, 0, 0, 0);
      }
      if (query.endDate) {
        toTime = new Date(query.endDate).setHours(23, 59, 59, 999);
      }
    }

    // 5. Calculate Opening Balance before filter range
    let openingBalance = 0;
    if (fromTime !== null) {
      const priorEntries = allChronological.filter(
        (e) => e.rawDate.getTime() < fromTime!,
      );
      if (priorEntries.length > 0) {
        openingBalance = priorEntries[priorEntries.length - 1].balance;
      }
    }

    // 6. Filter entries by date range
    let filtered = allChronological;
    if (fromTime !== null) {
      filtered = filtered.filter((e) => e.rawDate.getTime() >= fromTime!);
    }
    if (toTime !== null) {
      filtered = filtered.filter((e) => e.rawDate.getTime() <= toTime!);
    }

    // Period summary
    let periodCredit = 0;
    let periodDebit = 0;
    for (const item of filtered) {
      if (item.type === 'CREDIT') {
        periodCredit += item.amount;
      } else {
        periodDebit += item.amount;
      }
    }

    const closingBalance =
      filtered.length > 0
        ? filtered[filtered.length - 1].balance
        : openingBalance;

    // 7. Apply optional Type, Category, User, and Search filters
    if (query.type && query.type !== StatementTypeFilter.ALL) {
      filtered = filtered.filter((e) => e.type === query.type);
    }

    if (query.category && query.category !== 'all') {
      const catLower = query.category.toLowerCase().trim();
      filtered = filtered.filter((e) =>
        e.category.toLowerCase().includes(catLower),
      );
    }

    if (query.user_id && query.user_id !== 'all') {
      filtered = filtered.filter((e) => e.user.id === query.user_id);
    }

    if (query.search && query.search.trim()) {
      const s = query.search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.note.toLowerCase().includes(s) ||
          e.category.toLowerCase().includes(s) ||
          e.user.name.toLowerCase().includes(s),
      );
    }

    // 8. Sort order: ASC by default (Oldest first), or DESC if requested
    const isDesc = query.sortOrder === 'DESC';
    const sortedDisplay = [...filtered].sort((a, b) =>
      isDesc
        ? b.rawDate.getTime() - a.rawDate.getTime()
        : a.rawDate.getTime() - b.rawDate.getTime(),
    );

    // 9. Pagination
    const isAll = query.all === true || Number(query.limit) === 0 || Number(query.limit) === -1;
    const totalItems = sortedDisplay.length;
    let page = 1;
    let limit = totalItems;
    let totalPages = 1;
    let paginatedItems = sortedDisplay;

    if (!isAll) {
      page = Math.max(1, Number(query.page) || 1);
      limit = Math.max(1, Number(query.limit) || 20);
      totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const startIndex = (page - 1) * limit;
      paginatedItems = sortedDisplay.slice(startIndex, startIndex + limit);
    }

    return {
      summary: {
        openingBalance: Math.round(openingBalance * 100) / 100,
        closingBalance: Math.round(closingBalance * 100) / 100,
        totalCredit: Math.round(periodCredit * 100) / 100,
        totalDebit: Math.round(periodDebit * 100) / 100,
        netChange: Math.round((periodCredit - periodDebit) * 100) / 100,
        totalTransactions: totalItems,
        currentPoolBalance: Math.round(runningBalance * 100) / 100,
      },
      pagination: {
        page,
        limit,
        total: totalItems,
        totalPages,
      },
      items: paginatedItems.map((item) => {
        // Strip out rawDate before returning JSON
        const { rawDate, ...rest } = item;
        return rest;
      }),
    };
  }
}

