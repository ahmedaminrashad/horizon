# Migration Scripts

This directory contains scripts for generating and running database migrations.

## Available Commands

### Generate Migrations

#### Generate Clinic Migration
Creates a new clinic migration file with the format: `{timestamp}-{ClassName}.ts`

```bash
npm run migration:generate:clinic <MigrationName>
```

**Example:**
```bash
npm run migration:generate:clinic CreatePatientsTable
```

This will create:
- File: `src/database/migrations/clinic/{timestamp}-CreatePatientsTable.ts`
- Automatically updates `migrations-list.ts` to include the new migration

#### Generate Main Migration
Creates a new main database migration file with the format: `{timestamp}-{ClassName}.ts`

```bash
npm run migration:generate <MigrationName>
```

**Example:**
```bash
npm run migration:generate CreateAppointmentsTable
```

This will create:
- File: `src/database/migrations/{timestamp}-CreateAppointmentsTable.ts`

### Run Migrations

#### Run Clinic Migrations
Runs all pending clinic migrations on a specific tenant database.

```bash
npm run migration:run:clinic <databaseName>
```

**Example:**
```bash
npm run migration:run:clinic clinic_user_1
```

**Note:** This command runs migrations on a specific clinic tenant database. The database name should match the format used when creating clinic databases (e.g., `username_userid`).

#### Run Main Migrations
Runs all pending main database migrations.

```bash
npm run migration:run
```

This will:
- Connect to the main database (configured in `.env`)
- Run all pending migrations from `src/database/migrations/`
- Track executed migrations in the `migrations` table

## Migration File Format

### Clinic Migrations
- Location: `src/database/migrations/clinic/`
- Format: `{timestamp}-{ClassName}.ts`
- Example: `1699123456789-CreateUsersTable.ts`
- Must implement `MigrationInterface`
- Automatically registered in `migrations-list.ts`

### Main Migrations
- Location: `src/database/migrations/`
- Format: `{timestamp}-{ClassName}.ts`
- Example: `1699123456789-CreateRolesTable.ts`
- Must implement `MigrationInterface`
- Tracked by TypeORM's migration system

## Migration Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class YourMigrationName1699123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your migration logic here
    // Example: Create tables, add columns, etc.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add your rollback logic here
    // Example: Drop tables, remove columns, etc.
  }
}
```

## Notes

- **Clinic Migrations**: These are automatically run when a new clinic user registers. You can also run them manually for existing databases.
- **Main Migrations**: These run on the main application database and are executed manually using the run command.
- **Timestamps**: Migration timestamps are generated using `Date.now()` to ensure uniqueness and chronological order.
- **Migration Tracking**: Both clinic and main migrations track their execution status in a `migrations` table in their respective databases.

## Environment Variables

Make sure your `.env` file contains the following database configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=horizon
```

## Troubleshooting

### Migration already exists
If you get an error that a migration already exists, check the `migrations` table in your database to see which migrations have been executed.

### Migration fails
If a migration fails:
1. Check the error message for details
2. Fix the migration file
3. Manually remove the failed migration entry from the `migrations` table if needed
4. Re-run the migration

### Clinic migration not found
If a clinic migration is not found:
1. Check that it's added to `migrations-list.ts`
2. Verify the file exists in `src/database/migrations/clinic/`
3. Ensure the class name matches the file name pattern

