import { Address } from '@shared/models/address';
import { Contacts } from '@shared/models/contacts';


export interface AgencyResponse {
  id: string;
  name: string;
  address?: Address;
  contacts: Contacts;
}