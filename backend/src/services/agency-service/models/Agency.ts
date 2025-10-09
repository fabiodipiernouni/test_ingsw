import { Address } from '@shared/models/address';
import { Contacts } from '@shared/models/contacts';

export interface Agency {
  // Identificativo univoco
  id: string;

  // Informazioni base
  name: string;
  description?: string;

  address: Address;

  // Contatti
  Contact: Contacts;

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