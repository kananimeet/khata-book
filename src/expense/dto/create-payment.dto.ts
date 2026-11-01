import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    example: 1000,
    description:
      'Amount user wants to pay for this installment/request (accepts pay_amount, amount, or pay)',
  })
  @Expose()
  @Type(() => Number)
  @Transform(({ obj, value }) => {
    const raw =
      value !== undefined
        ? value
        : obj?.amount !== undefined
          ? obj?.amount
          : obj?.pay;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNotEmpty({ message: 'pay_amount should not be empty' })
  @IsNumber({}, { message: 'pay_amount must be a valid number' })
  @IsPositive({ message: 'pay_amount must be greater than 0' })
  pay_amount: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Alias for pay_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'amount must be a valid number' })
  amount?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Alias for pay_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'pay must be a valid number' })
  pay?: number;

  @ApiPropertyOptional({
    example: 'room pay second installment',
    description: 'Note for this payment request',
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
    example: 'room pay second installment',
    description: 'Alias for note',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;
}
