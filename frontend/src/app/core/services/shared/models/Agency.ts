import {Address} from '@service-shared/models/Address';
import {Contacts} from '@service-shared/models/Contacts';

export interface Agency {
  id: string;
  name: string;
  description?: string;

  address: Address;

  // Contatti
  contacts: Contacts;

  // Logo e licenza
  logo?: string;
  licenseNumber?: string;

  // Stato
  isActive: boolean;

  // Creatore
  createdBy: string;

  // Timestamp automatici
  createdAt: Date;
  updatedAt: Date;
}
