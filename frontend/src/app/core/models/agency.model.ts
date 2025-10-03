import {Address} from '@core/models/address.model';

export interface Agency {
  id: string;
  name: string;
  description?: string;
  address?: Address;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgencyRequest {
  name: string;
  description?: string;
  address?: Address;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  licenseNumber?: string;
}

export interface UpdateAgencyRequest extends Partial<CreateAgencyRequest> {
  id: string;
}
