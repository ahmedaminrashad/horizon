import { MigrationInterface } from 'typeorm';
import { CreateUsersTable1699123456789 } from './1699123456789-CreateUsersTable';
import { Addnametousers1762807516112 } from './1762807516112-Addnametousers';

/**
 * List of all clinic migrations in order
 * Add new migrations to this array in chronological order
 */
export const clinicMigrations: (new () => MigrationInterface)[] = [
  CreateUsersTable1699123456789,
  Addnametousers1762807516112,
];
