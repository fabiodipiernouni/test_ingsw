import { Address } from '../../shared/models/Address';
import { Contacts } from '../../shared/models/Contacts';


export interface AgencyResponse {
  id: string;
  name: string;
  address?: Address;
  contacts: Contacts;
}