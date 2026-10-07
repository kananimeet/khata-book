import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiPropertyOptional({
    example: "d9b2d63d-a233-4f25-b44e-123456789abc",
    description: "Optional user ID (Admin only: assign expense to a specific user)",
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.userId;
    return val === "" || val === null ? undefined : val;
  })
  @IsOptional()
  @IsUUID("4", { message: "user_id must be a valid UUID" })
  user_id?: string;

  @ApiPropertyOptional({
    example: "d9b2d63d-a233-4f25-b44e-123456789abc",
    description: "Alias for user_id",
  })
  @Expose()
  @IsOptional()
  @IsUUID("4", { message: "userId must be a valid UUID" })
  userId?: string;

  @ApiPropertyOptional({
    example: 6000,
    description:
      'Total amount of room rent or expense (also accepts "total"). Required for new expense, optional when paying towards remaining balance.',
  })
  @Expose()
  @Type(() => Number)
  @Transform(({ obj, value }) => {
    const raw = value !== undefined ? value : obj?.total;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsOptional()
  @IsNumber({}, { message: 'total_amount must be a valid number' })
  @IsPositive({ message: 'total_amount must be greater than 0' })
  total_amount?: number;

  @ApiPropertyOptional({
    example: 6000,
    description: 'Alias for total_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'total must be a valid number' })
  total?: number;

  @ApiProperty({
    example: 5000,
    description: 'Requested payment amount (also accepts "pay" or "amount")',
  })
  @Expose()
  @Type(() => Number)
  @Transform(({ obj, value }) => {
    const raw =
      value !== undefined
        ? value
        : obj?.pay !== undefined
          ? obj?.pay
          : obj?.amount;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNotEmpty({ message: 'pay_amount should not be empty' })
  @IsNumber({}, { message: 'pay_amount must be a valid number' })
  @IsPositive({ message: 'pay_amount must be greater than 0' })
  @Min(1, { message: 'pay_amount must be greater than 0' })
  pay_amount: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Alias for pay_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'pay must be a valid number' })
  pay?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Alias for pay_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'amount must be a valid number' })
  amount?: number;

  @ApiPropertyOptional({
    example: 'room pay',
    description: 'Description or note for the expense',
    default: 'room pay',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val =
      value !== undefined
        ? value
        : obj?.description !== undefined
          ? obj?.description
          : obj?.title;
    return val !== undefined && val !== null ? String(val) : undefined;
  })
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  note?: string;

  @ApiPropertyOptional({
    example: 'room pay',
    description: 'Alias for note',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    example: 'room pay',
    description: 'Alias for note',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'title must be a string' })
  title?: string;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a233-4f25-b44e-123456789abc',
    description:
      'Optional existing expense ID if submitting subsequent installment payment',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.expense_id;
    return val === '' || val === null ? undefined : val;
  })
  @IsOptional()
  @IsUUID('4', { message: 'expense_id must be a valid UUID' })
  expense_id?: string;

  @ApiPropertyOptional({
    example: 'Rent',
    description: 'Expense category',
  })
  @Expose()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: '2026-10-03',
    description: 'Expense date',
  })
  @Expose()
  @IsOptional()
  date?: string | Date;

  @ApiPropertyOptional({
    example: 'PENDING',
    description: 'Expense status',
  })
  @Expose()
  @IsOptional()
  status?: string;
}
