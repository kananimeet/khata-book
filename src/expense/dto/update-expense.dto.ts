import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus } from '../../common/enums/expense-status.enum.js';

export class UpdateExpenseDto {
  @ApiPropertyOptional({
    example: 6000,
    description: 'Total amount of room rent or expense',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @Transform(({ obj, value }) => {
    const raw = value !== undefined ? value : obj?.total;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNumber({}, { message: 'total_amount must be a valid number' })
  @Min(0, { message: 'total_amount must be 0 or greater' })
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

  @ApiPropertyOptional({
    example: 5000,
    description: 'Requested payment amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @Transform(({ obj, value }) => {
    const raw = value !== undefined ? value : obj?.pay;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNumber({}, { message: 'pay_amount must be a valid number' })
  @Min(0, { message: 'pay_amount must be 0 or greater' })
  pay_amount?: number;

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
    description: 'Approved paid amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @Transform(({ obj, value }) => {
    const raw =
      value !== undefined
        ? value
        : obj?.paid !== undefined
          ? obj?.paid
          : obj?.amount;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNumber({}, { message: 'paid_amount must be a valid number' })
  @Min(0, { message: 'paid_amount must be 0 or greater' })
  paid_amount?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Alias for paid_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'paid must be a valid number' })
  paid?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Alias for paid_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'amount must be a valid number' })
  amount?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Remaining unpaid amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @Transform(({ obj, value }) => {
    const raw = value !== undefined ? value : obj?.remaining;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNumber({}, { message: 'remaining_amount must be a valid number' })
  @Min(0, { message: 'remaining_amount must be 0 or greater' })
  remaining_amount?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Alias for remaining_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'remaining must be a valid number' })
  remaining?: number;

  @ApiPropertyOptional({
    enum: ExpenseStatus,
    example: ExpenseStatus.REMAINING,
    description:
      'Status of the expense (PENDING, REMAINING, COMPLETE, REJECTED)',
  })
  @Expose()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return typeof value === 'string'
      ? (value.toUpperCase() as ExpenseStatus)
      : value;
  })
  @IsEnum(ExpenseStatus, {
    message: 'status must be PENDING, REMAINING, COMPLETE, or REJECTED',
  })
  status?: ExpenseStatus;

  @ApiPropertyOptional({
    example: 'room pay updated',
    description: 'Description or note',
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
    example: 'room pay updated',
    description: 'Alias for note',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    example: 'room pay updated',
    description: 'Alias for note',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'title must be a string' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated room rate',
    description: 'Admin note or remarks',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val =
      value !== undefined
        ? value
        : obj?.reason !== undefined
          ? obj?.reason
          : obj?.comment;
    return val !== undefined && val !== null ? String(val) : undefined;
  })
  @IsOptional()
  @IsString({ message: 'admin_note must be a string' })
  admin_note?: string;

  @ApiPropertyOptional({
    example: 'Updated room rate',
    description: 'Alias for admin_note',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;
}
