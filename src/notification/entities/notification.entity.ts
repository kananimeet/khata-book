import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';

export enum NotificationType {
  EXPENSE_REQUEST = 'EXPENSE_REQUEST',
  EXPENSE_PAYMENT_REQUEST = 'EXPENSE_PAYMENT_REQUEST',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_PAYMENT_APPROVED = 'EXPENSE_PAYMENT_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  EXPENSE_PAYMENT_REJECTED = 'EXPENSE_PAYMENT_REJECTED',
  DAILY_EXPENSE_REQUEST = 'DAILY_EXPENSE_REQUEST',
  DAILY_EXPENSE_APPROVED = 'DAILY_EXPENSE_APPROVED',
  DAILY_EXPENSE_REJECTED = 'DAILY_EXPENSE_REJECTED',
  GENERAL = 'GENERAL',
}

@Entity('notifications')
@Index(['user_id', 'is_read'])
@Index(['user_id', 'created_at'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
