import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform, Expose } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({
    example: 6000,
    description: 'Default total room rent / expense amount',
  })
  @Expose()
  @Type(() => Number)
  @Transform(({ obj, value }) => {
    const raw = value !== undefined ? value : obj?.total;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const num = Number(raw);
    return isNaN(num) ? raw : num;
  })
  @IsNotEmpty({ message: 'total_amount should not be empty' })
  @IsNumber({}, { message: 'total_amount must be a valid number' })
  @IsPositive({ message: 'total_amount must be greater than 0' })
  total_amount: number;

  @ApiPropertyOptional({
    example: 6000,
    description: 'Alias for total_amount',
  })
  @Expose()
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'total must be a valid number' })
  @IsPositive({ message: 'total must be greater than 0' })
  total?: number;
}
