import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  DailyExpenseStatus,
  DailyExpenseType,
} from '../../common/enums/daily-expense.enum.js';

export class QueryChartExpenseDto {
  @ApiPropertyOptional({
    example: 2026,
    description: 'Year for monthly analytics (defaults to current year)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Month (1-12) for daily analytics (defaults to current month)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

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
    example: 'd9b2d63d-a233-4f25-b44e-123456789abc',
    description: 'Filter chart by user ID (Admin only)',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsUUID('4')
  user_id?: string;
}
