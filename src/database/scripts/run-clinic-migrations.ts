import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { clinicMigrations } from '../migrations/clinic/migrations-list';

// Load environment variables
config();

/**
 * Sanitize database name to prevent SQL injection
 */
function sanitizeDatabaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

/**
 * Get tenant database connection configuration for migrations
 * Note: Migrations don't need entities configuration
 */
function getTenantDatabaseConfig(databaseName: string): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: sanitizeDatabaseName(databaseName),
    // Migrations don't need entities - they work with raw SQL/queries
    synchronize: false,
  };
}

/**
 * Run clinic migrations on a specific tenant database
 * Usage: ts-node src/database/scripts/run-clinic-migrations.ts <databaseName>
 */
async function runClinicMigrations() {
  const databaseName = process.argv[2];

  if (!databaseName) {
    console.error('Error: Database name is required');
    console.log('Usage: npm run migration:run:clinic <databaseName>');
    console.log('Example: npm run migration:run:clinic clinic_user_1');
    process.exit(1);
  }

  const sanitizedDbName = sanitizeDatabaseName(databaseName);

  console.log(`Running clinic migrations on database: ${sanitizedDbName}`);

  // Create DataSource for tenant database
  const dbConfig = getTenantDatabaseConfig(sanitizedDbName);

  const dataSource = new DataSource({
    ...dbConfig,
    migrations: clinicMigrations.map((MigrationClass) => MigrationClass),
    migrationsTableName: 'migrations',
  });

  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log(`DataSource initialized for ${sanitizedDbName}`);

    // Check if migrations table exists, if not create it
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Check if migrations table exists
    const hasMigrationsTable = await queryRunner.hasTable('migrations');

    if (!hasMigrationsTable) {
      // Create migrations table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS \`migrations\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`timestamp\` BIGINT NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          UNIQUE KEY \`UQ_migrations_timestamp\` (\`timestamp\`),
          UNIQUE KEY \`UQ_migrations_name\` (\`name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('Migrations table created');
    }

    // Get pending migrations
    let executedMigrations: any[] = [];
    try {
      executedMigrations = await queryRunner.query(
        'SELECT * FROM `migrations` ORDER BY `timestamp` ASC',
      );
    } catch (error) {
      console.warn(
        'Could not query migrations table, assuming no migrations executed',
      );
      executedMigrations = [];
    }

    const executedTimestamps = new Set(
      executedMigrations.map((m: any) => parseInt(m.timestamp)),
    );

    // Run pending migrations
    let migrationsRun = 0;
    for (const MigrationClass of clinicMigrations) {
      const migration = new MigrationClass();
      const migrationName = MigrationClass.name;

      // Extract timestamp from migration name (last sequence of digits at the end)
      const timestampMatch = migrationName.match(/(\d+)$/);
      if (!timestampMatch) {
        console.warn(
          `Migration ${migrationName} does not have a timestamp, skipping`,
        );
        continue;
      }

      const timestamp = parseInt(timestampMatch[1]);

      // Check if migration has already been executed
      if (executedTimestamps.has(timestamp)) {
        console.log(`Migration ${migrationName} already executed, skipping`);
        continue;
      }

      try {
        // Run the migration
        console.log(`Running migration: ${migrationName}`);
        await migration.up(queryRunner);

        // Record migration execution
        await queryRunner.query(
          'INSERT INTO `migrations` (`timestamp`, `name`) VALUES (?, ?)',
          [timestamp, migrationName],
        );

        console.log(`✓ Migration ${migrationName} completed successfully`);
        migrationsRun++;
      } catch (error) {
        console.error(`Error running migration ${migrationName}:`, error);
        throw error;
      }
    }

    await queryRunner.release();
    await dataSource.destroy();

    console.log(
      `\n✓ All clinic migrations completed for database: ${sanitizedDbName}`,
    );
    console.log(`  Migrations run: ${migrationsRun}`);
    process.exit(0);
  } catch (error) {
    console.error(`Error running migrations on ${sanitizedDbName}:`, error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

runClinicMigrations();
