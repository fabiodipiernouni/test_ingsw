import {Address} from '@service-shared/models/Address';
import {Contacts} from '@service-shared/models/Contacts';

export interface AgencyModel {
  // Identificativo univoco
  id: string;

  // Informazioni base
  name: string;
  description?: string;

  address?: Address;

  // Contatti
  contacts?: Contacts;

  // Logo e licenza
  logo?: string;
  licenseNumber?: string;

  // Stato
  isActive: boolean;

  // Timestamp automatici
  createdAt: Date;
  updatedAt: Date;
}
