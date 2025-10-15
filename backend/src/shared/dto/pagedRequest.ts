import { IsOptional, IsInt, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PagedRequest {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
