import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class ApproveDailyExpenseDto {
  @ApiPropertyOptional({
    example: 'Verified bill and adjusted rent',
    description: 'Optional note from admin upon approval',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'admin_note must be a string' })
  admin_note?: string;
}

export class RejectDailyExpenseDto {
  @ApiPropertyOptional({
    example: 'Receipt unreadable or duplicate expense request',
    description: 'Reason for rejection',
  })
  @Expose()
  @IsOptional()
  @IsString({ message: 'admin_note must be a string' })
  admin_note?: string;
}
