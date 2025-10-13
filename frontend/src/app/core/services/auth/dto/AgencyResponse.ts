import { Address } from '@service-shared/models/address';
import { Contacts } from '@service-shared/models/contacts';


export interface AgencyResponse {
  id: string;
  name: string;
  address?: Address;
  contacts: Contacts;
}