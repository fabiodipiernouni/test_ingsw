import { Address } from '@shared/models/address';
import { Contacts } from '@shared/models/contacts';

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