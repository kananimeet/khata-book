import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, IsBoolean } from 'class-validator';
import { UserRole } from '../../common/enums/role.enum.js';

export class QueryUserDto {
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
    example: 'john',
    description: 'Search keyword matching name, email, or mobile',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Filter users by role (ADMIN or USER)',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter users by active status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
