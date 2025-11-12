import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Load environment variables
config();

/**
 * Run main database migrations
 * Usage: ts-node src/database/scripts/run-migrations.ts
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found. Creating...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('Migrations directory created. No migrations to run.');
    process.exit(0);
  }

  // Find all migration files (excluding clinic directory and test files)
  const migrationFiles = glob.sync('*.ts', {
    cwd: migrationsDir,
    ignore: ['**/*.spec.ts', '**/*.test.ts', 'clinic/**'],
    absolute: false,
  });

  if (migrationFiles.length === 0) {
    console.log('No migrations found in main migrations directory.');
    process.exit(0);
  }

  console.log(`Found ${migrationFiles.length} migration file(s)`);

  // Create DataSource with migration file paths
  // TypeORM will load and execute them
  // Note: Migrations don't need entities - they work with raw SQL/queries
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'horizon',
    // Migrations don't need entities - they work with raw SQL/queries
    migrations: migrationFiles.map((file) => path.join(migrationsDir, file)),
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: true,
  });

  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('DataSource initialized');

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
    } else {
      console.log('Migrations table already exists');
    }

    await queryRunner.release();

    // Run pending migrations
    const migrations = await dataSource.runMigrations();

    if (migrations.length === 0) {
      console.log('No pending migrations to run.');
    } else {
      console.log(`\n✓ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    }

    await dataSource.destroy();
    console.log('\n✓ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error running migrations:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

runMigrations();
