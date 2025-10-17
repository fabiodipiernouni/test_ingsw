import {PropertyModel} from '@core/services/property/models/PropertyModel';

export interface CreatePropertyResponse {
  success: boolean;
  data: PropertyModel;
  message?: string;
}
