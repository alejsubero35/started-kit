import { GenericRepository } from './generic.repository';

/** Repositorio de la entidad users. Extiende el repositorio genérico sin lógica de dominio. */
export class UserRepository extends GenericRepository<Record<string, unknown>> {
  constructor() {
    super('users');
  }
}

export const userRepository = new UserRepository();
