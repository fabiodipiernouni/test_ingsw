import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateAdminDto {
  @IsEmail({}, { message: 'Email is invalid' })
  email: string;

  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^[\d\s()+-]+$/, { message: 'Phone number format is invalid' })
  phone?: string;

}
