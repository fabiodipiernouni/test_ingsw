import { IsEmail, IsString, MinLength, IsBoolean, IsOptional, Matches, MaxLength, IsArray, ArrayUnique, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType, NOTIFICATION_TYPES } from '@shared/types/notification.types';

export class RegisterDto {
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsEmail({}, { message: 'Email is not valid' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must contain at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password: string;

  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must contain at least 2 characters' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must contain at least 2 characters' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName: string;

  @IsBoolean({ message: 'You must accept the terms and conditions' })
  acceptTerms: boolean;

  @IsBoolean({ message: 'You must accept the privacy policy' })
  acceptPrivacy: boolean;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\+\d{1,15}$/, {
    message: 'Phone number must be in E.164 format (e.g. +391234567890)'
  })
  phone?: string;

  @IsArray()
  @ArrayUnique()
  @IsEnum(NOTIFICATION_TYPES, { each: true })
  enabledNotificationTypes!: NotificationType[];
}