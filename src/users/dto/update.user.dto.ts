import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  userName?: string;

  @IsOptional()
  @IsEmail()
  @MinLength(3)
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;
}
