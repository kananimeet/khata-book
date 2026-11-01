import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import {
  DailyExpenseType,
  DailyExpenseStatus,
} from '../../common/enums/daily-expense.enum.js';
import { ColumnNumericTransformer } from '../../helper/numeric-transformer.js';

@Entity('daily_expenses')
@Index(['user_id', 'created_at'])
@Index(['user_id', 'expense_date'])
@Index(['expense_date'])
@Index(['status'])
@Index(['expense_type'])
@Index(['category'])
@Index(['created_at'])
@Index(['status', 'created_at'])
@Index(['expense_type', 'created_at'])
@Index(['category', 'created_at'])
@Index(['expense_date', 'status'])
@Index(['user_id', 'status'])
export class DailyExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  payment_photo?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({
    type: 'enum',
    enum: DailyExpenseType,
    default: DailyExpenseType.ROOM,
  })
  expense_type: DailyExpenseType;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  expense_date: Date;

  @Column({
    type: 'enum',
    enum: DailyExpenseStatus,
    default: DailyExpenseStatus.PENDING,
  })
  status: DailyExpenseStatus;

  @Column({ type: 'text', nullable: true })
  admin_note?: string;

  @Column({ type: 'boolean', default: false })
  is_rent_adjusted: boolean;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  rent_adjusted_amount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
