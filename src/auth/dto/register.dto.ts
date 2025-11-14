import {
  MaxLength,
  MinLength,
  IsString,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  userName: string;

  @IsEmail()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
