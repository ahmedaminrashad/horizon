import { MigrationInterface } from 'typeorm';
import { CreateUsersTable1699123456789 } from './1699123456789-CreateUsersTable';
import { Addnametousers1762807516112 } from './1762807516112-Addnametousers';
import { CreateDoctorsTable1764000000000 } from './1764000000000-CreateDoctorsTable';
import { CreateRolesAndPermissionsTables1764000000001 } from './1764000000001-CreateRolesAndPermissionsTables';
import { SeedClinicRolesAndPermissions1764000000002 } from './1764000000002-SeedClinicRolesAndPermissions';

/**
 * List of all clinic migrations in order
 * Add new migrations to this array in chronological order
 */
export const clinicMigrations: (new () => MigrationInterface)[] = [
  CreateUsersTable1699123456789,
  Addnametousers1762807516112,
  CreateDoctorsTable1764000000000,
  CreateRolesAndPermissionsTables1764000000001,
  SeedClinicRolesAndPermissions1764000000002,
];
