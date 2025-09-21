// Augment Express types to include our User interface
import { User as CustomUser } from '../types/common.types';

declare global {
  namespace Express {
    interface User extends CustomUser {}
  }
}

export {};