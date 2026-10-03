import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { ExpensePaymentStatus } from '../../common/enums/expense-status.enum.js';
import { ColumnNumericTransformer } from '../../helper/numeric-transformer.js';
import { Expense } from './expense.entity.js';
@Entity('expense_payments')
export class ExpensePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  expense_id: string;

  @ManyToOne(() => Expense, (expense) => expense.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expense_id' })
  expense: Relation<Expense>;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note?: string;

  @Column({
    type: 'enum',
    enum: ExpensePaymentStatus,
    default: ExpensePaymentStatus.PENDING,
  })
  status: ExpensePaymentStatus;

  @Column({ type: 'text', nullable: true })
  admin_note?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
