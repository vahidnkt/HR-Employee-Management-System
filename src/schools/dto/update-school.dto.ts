import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';

export class UpdateSchoolDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  logo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  banner?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsEmail({}, { message: 'Email must be valid' })
  @IsOptional()
  email?: string;
}
