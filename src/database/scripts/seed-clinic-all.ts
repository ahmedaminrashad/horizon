import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as mysql from 'mysql2/promise';
import { seedClinicRolesAndPermissions } from '../seeds/clinic-roles-permissions.seeder';
import { seedClinicSettings } from '../seeds/clinic-settings.seeder';

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
 * Get tenant database connection configuration for seeding
 */
function getTenantDatabaseConfig(databaseName: string): DataSourceOptions {
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: sanitizeDatabaseName(databaseName),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
  };
}

/**
 * Get all clinic databases from clinics table
 */
async function getClinicDatabases(): Promise<string[]> {
  const connection = await mysql.createConnection(getMainDatabaseConfig());

  try {
    // Get all database_name from clinics table
    const [rows] = await connection.query(
      `SELECT database_name 
       FROM clinics 
       WHERE database_name IS NOT NULL AND database_name != ''`,
    );

    const databases = (rows as any[]).map((row) => row.database_name);
    return databases;
  } finally {
    await connection.end();
  }
}

/**
 * Seed a specific clinic database
 */
async function seedClinicDatabase(databaseName: string): Promise<boolean> {
  const sanitizedDbName = sanitizeDatabaseName(databaseName);

  console.log(`\n[${sanitizedDbName}] Seeding clinic database...`);

  // Create DataSource for tenant database
  const dbConfig = getTenantDatabaseConfig(sanitizedDbName);

  const dataSource = new DataSource(dbConfig);

  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log(`[${sanitizedDbName}] DataSource initialized`);

    // Seed roles and permissions
    console.log(`[${sanitizedDbName}] Seeding roles and permissions...`);
    await seedClinicRolesAndPermissions(dataSource);

    // Seed clinic settings
    console.log(`[${sanitizedDbName}] Seeding clinic settings...`);
    await seedClinicSettings(dataSource);

    await dataSource.destroy();

    console.log(`[${sanitizedDbName}] ✓ Seeding completed successfully`);
    return true;
  } catch (error) {
    console.error(`[${sanitizedDbName}] Error seeding database:`, error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    return false;
  }
}

/**
 * Seed all clinic databases
 */
async function seedClinicAll() {
  console.log('Fetching clinic databases from clinics table...\n');

  try {
    const databases = await getClinicDatabases();

    if (databases.length === 0) {
      console.log('No clinic databases found in clinics table.');
      console.log('Make sure you have clinics with database_name set.');
      process.exit(0);
    }

    console.log(`Found ${databases.length} clinic database(s):`);
    databases.forEach((db, index) => {
      console.log(`  ${index + 1}. ${db}`);
    });

    console.log('\nStarting seeding...\n');

    let successCount = 0;
    let failCount = 0;

    for (const database of databases) {
      const success = await seedClinicDatabase(database);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Seeding Summary:');
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
    console.error('Error seeding clinic databases:', error);
    process.exit(1);
  }
}

seedClinicAll();

