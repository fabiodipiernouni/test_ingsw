import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { Trim, ToLowerCase } from '@shared/decorators';

export class CreateAdminDto {
  @Trim()
  @ToLowerCase()
  @IsEmail({}, { message: 'Email is invalid' })
  email: string;

  @Trim()
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName: string;

  @Trim()
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName: string;

  @IsOptional()
  @Trim()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\+\d{1,15}$/, { 
    message: 'Phone number must be in E.164 format (e.g., +391234567890)' 
  })
  phone?: string;

}
