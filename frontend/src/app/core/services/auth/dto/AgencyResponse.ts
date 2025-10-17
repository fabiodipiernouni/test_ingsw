import {Address} from '@service-shared/models/Address';
import {Contacts} from '@service-shared/models/Contacts';

export interface AgencyResponse {
  id: string;
  name: string;
  address?: Address;
  contacts: Contacts;
}
