import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform, Expose } from 'class-transformer';

export class ApproveExpenseDto {
  @ApiPropertyOptional({
    example: 'Payment received via UPI, approved',
    description: 'Admin remarks or approval note',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val =
      value !== undefined
        ? value
        : obj?.note !== undefined
          ? obj?.note
          : obj?.comment !== undefined
            ? obj?.comment
            : obj?.reason;
    return val !== undefined && val !== null ? String(val) : undefined;
  })
  @IsOptional()
  @IsString()
  admin_note?: string;

  @ApiPropertyOptional({
    example: 'Payment received via UPI, approved',
    description: 'Alias for admin_note',
  })
  @Expose()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: 'Payment received via UPI, approved',
    description: 'Alias for admin_note',
  })
  @Expose()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectExpenseDto {
  @ApiPropertyOptional({
    example: 'Payment receipt is invalid or not received',
    description: 'Reason for rejection',
  })
  @Expose()
  @Transform(({ obj, value }) => {
    const val =
      value !== undefined
        ? value
        : obj?.admin_note !== undefined
          ? obj?.admin_note
          : obj?.note !== undefined
            ? obj?.note
            : obj?.comment;
    return val !== undefined && val !== null ? String(val) : undefined;
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: 'Payment receipt is invalid or not received',
    description: 'Alias for reason',
  })
  @Expose()
  @IsOptional()
  @IsString()
  admin_note?: string;

  @ApiPropertyOptional({
    example: 'Payment receipt is invalid or not received',
    description: 'Alias for reason',
  })
  @Expose()
  @IsOptional()
  @IsString()
  note?: string;
}
