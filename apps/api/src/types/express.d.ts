import { Role } from '../generated/prisma/enums.js';

export interface AuthUser {
  id: string;
  authId: string;
  email: string;
  role: Role;
  name?: string;
  username?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
