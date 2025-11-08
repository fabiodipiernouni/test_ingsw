import { Address } from '@shared/models/Address';
import { Contacts } from '@shared/models/Contacts';


export interface AgencyResponse {
  id: string;
  name: string;
  description?: string;
  address?: Address;
  contacts?: Contacts;
  logo?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}