import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DailyExpenseType } from '../../common/enums/daily-expense.enum.js';

export class CreateDailyExpenseDto {
  @ApiProperty({
    example: 450.5,
    description: 'Amount spent on daily purchase',
  })
  @Expose()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNotEmpty({ message: 'amount should not be empty' })
  @IsNumber({}, { message: 'amount must be a valid number' })
  @IsPositive({ message: 'amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'GROCERY',
    description: 'Category of expense (e.g. GROCERY, VEGETABLES, MILK, GAS, UTILITIES, PERSONAL)',
  })
  @Expose()
  @IsNotEmpty({ message: 'category should not be empty' })
  @IsString({ message: 'category must be a string' })
  category: string;

  @ApiProperty({
    example: 'room',
    enum: DailyExpenseType,
    description: "Expense type: 'room' (reduces room rent obligation) or 'own' (personal expense request sent to admin)",
  })
  @Expose()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsNotEmpty({ message: 'expense_type should not be empty' })
  @IsIn([DailyExpenseType.ROOM, DailyExpenseType.OWN], {
    message: "expense_type must be either 'room' or 'own'",
  })
  expense_type: DailyExpenseType;

  @ApiPropertyOptional({
    example: 'Bought weekly vegetables from market',
    description: 'Optional note or description of what was purchased',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.description;
    return val !== undefined && val !== null ? String(val) : undefined;
  })
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  note?: string;

  @ApiPropertyOptional({
    example: '2026-10-04',
    description: 'Date when the expense was made (defaults to current date if omitted)',
  })
  @Expose()
  @IsOptional()
  expense_date?: string | Date;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Photo of the receipt, bill, or payment screenshot (upload via form-data or send URL)',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'payment_photo must be a string or file path' })
  payment_photo?: string;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a233-4f25-b44e-123456789abc',
    description: 'Optional user ID (Admin only: assign expense to a specific user)',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.userId;
    return val === '' || val === null ? undefined : val;
  })
  @IsOptional()
  @IsUUID('4', { message: 'user_id must be a valid UUID' })
  user_id?: string;
}
