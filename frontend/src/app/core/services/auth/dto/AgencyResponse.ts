import {Address} from '@service-shared/models/Address';
import {Contacts} from '@service-shared/models/Contacts';

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