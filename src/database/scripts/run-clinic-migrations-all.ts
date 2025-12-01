import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { clinicMigrations } from '../migrations/clinic/migrations-list';
import * as mysql from 'mysql2/promise';

// Load environment variables
config();

/**
 * Sanitize database name to prevent SQL injection
 */
function sanitizeDatabaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

/**
 * Get main database connection configuration
 */
function getMainDatabaseConfig(): mysql.ConnectionOptions {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'horizon',
  };
}

/**
 * Get tenant database connection configuration for migrations
 */
function getTenantDatabaseConfig(databaseName: string): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: sanitizeDatabaseName(databaseName),
    synchronize: false,
  };
}

/**
 * Get all clinic databases from users table
 */
async function getClinicDatabases(): Promise<string[]> {
  const connection = await mysql.createConnection(getMainDatabaseConfig());

  try {
    // Get all users with clinic role
    const [rows] = await connection.query(
      `SELECT u.database_name 
       FROM users u 
       INNER JOIN roles r ON u.role_id = r.id 
       WHERE r.slug = 'clinic' AND u.database_name IS NOT NULL AND u.database_name != ''`,
    );

    const databases = (rows as any[]).map((row) => row.database_name);
    return databases;
  } finally {
    await connection.end();
  }
}

/**
 * Run clinic migrations on a specific tenant database
 */
async function runMigrationsOnDatabase(databaseName: string): Promise<boolean> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);

  console.log(`\n[${sanitizedDbName}] Running clinic migrations...`);

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
    console.log(`[${sanitizedDbName}] DataSource initialized`);

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
      console.log(`[${sanitizedDbName}] Migrations table created`);
    }

    // Get pending migrations
    let executedMigrations: any[] = [];
    try {
      executedMigrations = await queryRunner.query(
        'SELECT * FROM `migrations` ORDER BY `timestamp` ASC',
      );
    } catch (error) {
      console.warn(
        `[${sanitizedDbName}] Could not query migrations table, assuming no migrations executed`,
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
          `[${sanitizedDbName}] Migration ${migrationName} does not have a timestamp, skipping`,
        );
        continue;
      }

      const timestamp = parseInt(timestampMatch[1]);

      // Check if migration has already been executed
      if (executedTimestamps.has(timestamp)) {
        console.log(
          `[${sanitizedDbName}] Migration ${migrationName} already executed, skipping`,
        );
        continue;
      }

      try {
        // Run the migration
        console.log(`[${sanitizedDbName}] Running migration: ${migrationName}`);
        await migration.up(queryRunner);

        // Record migration execution
        await queryRunner.query(
          'INSERT INTO `migrations` (`timestamp`, `name`) VALUES (?, ?)',
          [timestamp, migrationName],
        );

        console.log(
          `[${sanitizedDbName}] ✓ Migration ${migrationName} completed successfully`,
        );
        migrationsRun++;
      } catch (error) {
        console.error(
          `[${sanitizedDbName}] Error running migration ${migrationName}:`,
          error,
        );
        throw error;
      }
    }

    await queryRunner.release();
    await dataSource.destroy();

    console.log(
      `[${sanitizedDbName}] ✓ All migrations completed (${migrationsRun} migrations run)`,
    );
    return true;
  } catch (error) {
    console.error(`[${sanitizedDbName}] Error running migrations:`, error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    return false;
  }
}

/**
 * Run clinic migrations on all clinic databases
 */
async function runClinicMigrationsAll() {
  console.log('Fetching clinic databases from users table...\n');

  try {
    const databases = await getClinicDatabases();

    if (databases.length === 0) {
      console.log('No clinic databases found in users table.');
      console.log('Make sure you have users with role "clinic" and database_name set.');
      process.exit(0);
    }

    console.log(`Found ${databases.length} clinic database(s):`);
    databases.forEach((db, index) => {
      console.log(`  ${index + 1}. ${db}`);
    });

    console.log('\nStarting migrations...\n');

    let successCount = 0;
    let failCount = 0;

    for (const database of databases) {
      const success = await runMigrationsOnDatabase(database);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`  Total databases: ${databases.length}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    console.log('='.repeat(50));

    if (failCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running clinic migrations:', error);
    process.exit(1);
  }
}

runClinicMigrationsAll();
