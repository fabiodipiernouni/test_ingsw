import { Request } from 'express';
import { UserModel } from '@shared/models/UserModel';
import { Agency } from '@shared/database/models';

export interface AuthenticatedRequest extends Request {
  user?: UserModel;
  userAgency?: Agency;
}