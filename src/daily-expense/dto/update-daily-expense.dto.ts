import { PartialType } from '@nestjs/swagger';
import { CreateDailyExpenseDto } from './create-daily-expense.dto.js';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { DailyExpenseStatus } from '../../common/enums/daily-expense.enum.js';

export class UpdateDailyExpenseDto extends PartialType(CreateDailyExpenseDto) {
  @ApiPropertyOptional({
    enum: DailyExpenseStatus,
    description: 'Status of the expense request (Admin only or system)',
  })
  @Expose()
  @IsOptional()
  @IsEnum(DailyExpenseStatus, {
    message: 'status must be PENDING, APPROVED, or REJECTED',
  })
  status?: DailyExpenseStatus;

  @ApiPropertyOptional({
    example: 'Verified bill and approved deduction from room rent',
    description: 'Notes from admin regarding approval/rejection',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'admin_note must be a string' })
  admin_note?: string;
}
