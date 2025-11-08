import { Request } from 'express';
import { UserModel } from '@shared/models/UserModel';

export interface AuthenticatedRequest extends Request {
  user?: UserModel;
}

/**
 * Type guard per verificare che req.user sia presente
 * Usare questo per garantire che l'utente sia autenticato
 */
export function isAuthenticated(req: AuthenticatedRequest): req is AuthenticatedRequest & { user: UserModel } {
  return req.user !== undefined;
}