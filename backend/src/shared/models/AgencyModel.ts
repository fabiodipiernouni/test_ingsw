import { Address } from '@shared/models/Address';
import { Contacts } from '@shared/models/Contacts';

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

  // Creatore
  createdBy: string;

  // Timestamp automatici
  createdAt: Date;
  updatedAt: Date;
}