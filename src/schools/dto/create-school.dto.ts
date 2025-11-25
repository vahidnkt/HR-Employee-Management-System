import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @MinLength(3, { message: 'School name must be at least 3 characters' })
  @MaxLength(255, { message: 'School name must not exceed 255 characters' })
  name: string;

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
