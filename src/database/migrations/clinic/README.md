# Clinic Database Migrations

This directory contains migrations for clinic (tenant) databases. These migrations are automatically run when a new clinic user registers.

## Migration Structure

Each migration file follows the naming convention: `{timestamp}-{MigrationName}.ts`

Example: `1699123456789-CreateUsersTable.ts`

## Adding New Migrations

1. **Create a new migration file** in this directory:
   ```typescript
   import { MigrationInterface, QueryRunner, Table } from 'typeorm';

   export class YourMigrationName1699123456789 implements MigrationInterface {
     public async up(queryRunner: QueryRunner): Promise<void> {
       // Migration logic here
       await queryRunner.createTable(/* ... */);
     }

     public async down(queryRunner: QueryRunner): Promise<void> {
       // Rollback logic here
       await queryRunner.dropTable(/* ... */);
     }
   }
   ```

2. **Add the migration to the migrations list** in `migrations-list.ts`:
   ```typescript
   import { YourMigrationName1699123456789 } from './1699123456789-YourMigrationName';

   export const clinicMigrations: (new () => MigrationInterface)[] = [
     CreateUsersTable1699123456789,
     YourMigrationName1699123456789, // Add your migration here
   ];
   ```

3. **Use a unique timestamp** - The timestamp should be unique and sequential. You can generate one using:
   - Current timestamp: `Date.now()`
   - Or use a specific format: `YYYYMMDDHHMMSS`

## Migration Execution

Migrations are automatically executed when:
- A new clinic user registers (during database creation)
- You can also manually run migrations using `ClinicMigrationService.runMigrations(databaseName)`

## Migration Tracking

All executed migrations are tracked in the `migrations` table in each clinic database. The service automatically:
- Creates the migrations table if it doesn't exist
- Tracks which migrations have been executed
- Only runs pending migrations
- Logs all migration activities

## Notes

- Migrations run in the order they appear in `migrations-list.ts`
- Each migration is executed only once per database
- If a migration fails, the process stops and the error is logged
- Migrations are specific to clinic databases and don't affect the main database

