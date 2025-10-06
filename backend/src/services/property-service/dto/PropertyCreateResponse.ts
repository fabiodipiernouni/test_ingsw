import { PropertyDto } from '@property/dto/PropertyDto';

export interface CreatePropertyResponse {
  success: boolean;
  data: PropertyDto;
  message?: string;
}