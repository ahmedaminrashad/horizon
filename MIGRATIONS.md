# Database Migrations Guide

This document explains how to work with database migrations in the Horizon Backend application.

## Overview

The application uses two types of migrations:
1. **Main Database Migrations** - For the main application database
2. **Clinic Database Migrations** - For tenant (clinic) databases

## Migration Commands

### Generate Migrations

#### Generate Clinic Migration
Create a new migration for clinic (tenant) databases:

```bash
npm run migration:generate:clinic <MigrationName>
```

**Example:**
```bash
npm run migration:generate:clinic CreatePatientsTable
npm run migration:generate:clinic AddAppointmentFields
```

**What it does:**
- Creates a new migration file in `src/database/migrations/clinic/`
- File format: `{timestamp}-{ClassName}.ts` (e.g., `1699123456789-CreatePatientsTable.ts`)
- Automatically updates `migrations-list.ts` to include the new migration
- The migration will run automatically when new clinic users register

#### Generate Main Migration
Create a new migration for the main application database:

```bash
npm run migration:generate <MigrationName>
```

**Example:**
```bash
npm run migration:generate CreateRolesTable
npm run migration:generate AddUserFields
```

**What it does:**
- Creates a new migration file in `src/database/migrations/`
- File format: `{timestamp}-{ClassName}.ts` (e.g., `1699123456789-CreateRolesTable.ts`)
- Migrations are tracked by TypeORM's migration system

### Run Migrations

#### Run Clinic Migrations
Run pending clinic migrations on a specific tenant database:

```bash
npm run migration:run:clinic <databaseName>
```

**Example:**
```bash
npm run migration:run:clinic clinic_user_1
npm run migration:run:clinic john_doe_5
```

**When to use:**
- After creating new clinic migrations
- To update existing clinic databases with new migrations
- When a clinic database needs to be updated manually

**Note:** Clinic migrations are automatically run when a new clinic user registers. Use this command to update existing databases.

#### Run Main Migrations
Run pending migrations on the main application database:

```bash
npm run migration:run
```

**What it does:**
- Connects to the main database (configured in `.env`)
- Runs all pending migrations from `src/database/migrations/`
- Tracks executed migrations in the `migrations` table

## Migration File Structure

### Clinic Migration Example

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePatientsTable1699123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patients',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_patients_email',
            columnNames: ['email'],
            isUnique: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('patients');
  }
}
```

### Main Migration Example

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRolesTable1699123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('roles');
  }
}
```

## Directory Structure

```
src/database/
├── migrations/
│   ├── clinic/                    # Clinic (tenant) migrations
│   │   ├── 1699123456789-CreateUsersTable.ts
│   │   ├── migrations-list.ts     # Auto-updated list of migrations
│   │   └── README.md
│   ├── 1699123456789-CreateRolesTable.ts  # Main migrations
│   └── ...
├── scripts/
│   ├── generate-clinic-migration.ts
│   ├── generate-migration.ts
│   ├── run-clinic-migrations.ts
│   ├── run-migrations.ts
│   └── README.md
└── ...
```

## How Migrations Work

### Clinic Migrations

1. **Automatic Execution**: When a clinic user registers, migrations are automatically run on their new database
2. **Manual Execution**: Use `npm run migration:run:clinic <databaseName>` to run migrations on existing databases
3. **Migration Tracking**: Executed migrations are tracked in the `migrations` table in each clinic database
4. **Migration List**: All clinic migrations are registered in `migrations-list.ts`

### Main Migrations

1. **Manual Execution**: Run `npm run migration:run` to execute pending migrations
2. **Migration Tracking**: Executed migrations are tracked in the `migrations` table in the main database
3. **TypeORM Integration**: Uses TypeORM's built-in migration system

## Migration Naming Convention

- **Format**: `{timestamp}-{ClassName}.ts`
- **Timestamp**: Generated using `Date.now()` (e.g., `1699123456789`)
- **ClassName**: PascalCase version of the migration name (e.g., `CreateUsersTable`)
- **Example**: `1699123456789-CreateUsersTable.ts`

## Best Practices

### 1. Migration Naming
- Use descriptive names that explain what the migration does
- Use PascalCase for class names
- Examples:
  - `CreateUsersTable` ✅
  - `AddEmailToUsers` ✅
  - `RemoveOldColumns` ✅
  - `migration1` ❌
  - `update_table` ❌

### 2. Writing Migrations
- Always implement both `up()` and `down()` methods
- `up()`: Applies the migration
- `down()`: Reverts the migration (rollback)
- Test migrations on a development database first
- Keep migrations small and focused

### 3. Clinic Migrations
- Clinic migrations are shared across all tenant databases
- Make sure migrations are idempotent (can be run multiple times safely)
- Use `IF NOT EXISTS` or check for existence before creating objects
- Consider backward compatibility when modifying existing tables

### 4. Main Migrations
- Main migrations affect the core application database
- Be careful when modifying critical tables (users, roles, permissions)
- Always backup the database before running migrations in production
- Test migrations in a staging environment first

## Environment Configuration

Make sure your `.env` file contains the database configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=horizon
```

## Troubleshooting

### Migration Already Executed

If a migration has already been executed, it will be skipped automatically. To re-run a migration:

1. Check the `migrations` table in your database
2. Remove the migration entry if needed (be careful!)
3. Re-run the migration

### Migration Fails

If a migration fails:

1. Check the error message for details
2. Fix the migration file
3. If the migration partially executed, you may need to:
   - Manually fix the database state
   - Remove the failed migration entry from the `migrations` table
   - Re-run the migration

### Clinic Migration Not Found

If a clinic migration is not being executed:

1. Verify it's added to `migrations-list.ts`
2. Check the file exists in `src/database/migrations/clinic/`
3. Ensure the class name matches the file name pattern
4. Verify the migration implements `MigrationInterface`

### Database Connection Error

If you get a database connection error:

1. Check your `.env` file configuration
2. Verify the database server is running
3. Check database credentials
4. Ensure the database exists (for main migrations)
5. For clinic migrations, verify the database name is correct

## Common Migration Operations

### Create Table

```typescript
await queryRunner.createTable(
  new Table({
    name: 'table_name',
    columns: [
      // column definitions
    ],
  }),
  true, // ifNotExists
);
```

### Add Column

```typescript
await queryRunner.addColumn('table_name', new TableColumn({
  name: 'column_name',
  type: 'varchar',
  length: '255',
  isNullable: true,
}));
```

### Drop Column

```typescript
await queryRunner.dropColumn('table_name', 'column_name');
```

### Create Index

```typescript
await queryRunner.createIndex('table_name', new TableIndex({
  name: 'IDX_table_name_column',
  columnNames: ['column_name'],
  isUnique: true,
}));
```

### Add Foreign Key

```typescript
await queryRunner.createForeignKey('table_name', new TableForeignKey({
  columnNames: ['foreign_key_column'],
  referencedColumnNames: ['id'],
  referencedTableName: 'referenced_table',
  onDelete: 'CASCADE',
}));
```

## Migration Workflow

### Adding a New Feature to Clinic Databases

1. Generate a new clinic migration:
   ```bash
   npm run migration:generate:clinic CreateNewTable
   ```

2. Edit the migration file with your changes

3. Test the migration:
   ```bash
   npm run migration:run:clinic <test_database_name>
   ```

4. Commit the migration file

5. New clinic registrations will automatically run the migration

6. For existing clinics, run:
   ```bash
   npm run migration:run:clinic <database_name>
   ```

### Adding a New Feature to Main Database

1. Generate a new main migration:
   ```bash
   npm run migration:generate CreateNewTable
   ```

2. Edit the migration file with your changes

3. Test the migration:
   ```bash
   npm run migration:run
   ```

4. Commit the migration file

5. Deploy and run migrations in production:
   ```bash
   npm run migration:run
   ```

## Additional Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [MySQL Data Types](https://dev.mysql.com/doc/refman/8.0/en/data-types.html)
- Project-specific migration scripts: `src/database/scripts/README.md`

## Support

If you encounter issues with migrations:

1. Check the error logs
2. Review the migration file syntax
3. Verify database connectivity
4. Check the `migrations` table for execution status
5. Consult the TypeORM documentation

---

**Last Updated**: 2024
**Version**: 1.0.0

