import { PropertyModel } from '@property/models/PropertyModel';


export interface CreatePropertyResponse {
  success: boolean;
  data: PropertyModel;
  message?: string;
}