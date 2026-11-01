import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  DailyExpenseStatus,
  DailyExpenseType,
} from '../../common/enums/daily-expense.enum.js';

export class QueryDailyExpenseDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Number of items per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'vegetables',
    description: 'Search keyword matching note, category, or user name',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: DailyExpenseType,
    description: "Filter by expense type ('room' or 'own')",
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'string'
      ? (value.toLowerCase() as DailyExpenseType)
      : value;
  })
  @IsEnum(DailyExpenseType)
  expense_type?: DailyExpenseType;

  @ApiPropertyOptional({
    enum: DailyExpenseStatus,
    description: 'Filter by status (PENDING, APPROVED, REJECTED)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'string'
      ? (value.toUpperCase() as DailyExpenseStatus)
      : value;
  })
  @IsEnum(DailyExpenseStatus)
  status?: DailyExpenseStatus;

  @ApiPropertyOptional({
    example: 'GROCERY',
    description: 'Filter by category',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a233-4f25-b44e-123456789abc',
    description: 'Filter expenses by specific user ID (Admin only)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsUUID('4')
  user_id?: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Start date filter (YYYY-MM-DD)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'End date filter (YYYY-MM-DD)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  endDate?: string;
}
