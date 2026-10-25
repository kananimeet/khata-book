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
import { ExpenseStatus } from '../../common/enums/expense-status.enum.js';

export class QueryExpenseDto {
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
    example: 'room pay',
    description: 'Search keyword matching note, user name, email, or mobile',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ExpenseStatus,
    description:
      'Filter by expense status (PENDING, REMAINING, COMPLETE, REJECTED)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'string'
      ? (value.toUpperCase() as ExpenseStatus)
      : value;
  })
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a233-4f25-b44e-123456789abc',
    description: 'Filter expenses by specific user ID',
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
