import { UserRole } from '@prisma/client';

// por default, o request do express nao tem a propriedade user, ent temos de dizer ao typescript que ela existe
// ent declaramos um global augmentation, no namespace Express, na interface Request, adicionamos a propriedade user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userName: string;
        role: UserRole; // Usa o Enum do Prisma (ADMIN, SALES, etc.)
      };
    }
  }
}