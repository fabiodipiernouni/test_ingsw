import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUrl, Matches } from 'class-validator';
import { Trim } from '@shared/decorators';

export class SendPromotionalMessageDto {
  @Trim()
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @Trim()
  @IsNotEmpty({ message: 'Message is required' })
  @IsString({ message: 'Message must be a string' })
  @MaxLength(4000, { message: 'Message cannot exceed 4000 characters' })
  message!: string;

  @IsOptional()
  @Trim()
  @IsString({ message: 'Action URL must be a string' })
  @Matches(/^(https?:\/\/.+|\/[\w\-\/]*)$/, { 
    message: 'Action URL must be a valid URL (http/https) or a valid path starting with /' 
  })
  @MaxLength(2000, { message: 'Action URL cannot exceed 2000 characters' })
  actionUrl?: string;

  @IsOptional()
  @Trim()
  @IsString({ message: 'Image URL must be a string' })
  @Matches(/^(https?:\/\/.+|\/[\w\-\/]*)$/, { 
    message: 'Image URL must be a valid URL (http/https) or a valid path starting with /' 
  })
  @MaxLength(2000, { message: 'Image URL cannot exceed 2000 characters' })
  imageUrl?: string;
}
