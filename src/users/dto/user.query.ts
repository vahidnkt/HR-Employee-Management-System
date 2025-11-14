import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class UserQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['admin', 'user'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
