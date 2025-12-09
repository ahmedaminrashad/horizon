import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedAdmin } from './admin.seeder';
import { seedRolesAndPermissions } from './roles-permissions.seeder';
import { seedSettings } from './settings.seeder';

// Load environment variables
config();

async function runSeed() {
  // Create DataSource
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'horizon',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established.');

    // Run seeders - roles and permissions first, then admin, then settings
    console.log('\n=== Seeding Roles and Permissions ===');
    await seedRolesAndPermissions(dataSource);

    console.log('\n=== Seeding Admin User ===');
    await seedAdmin(dataSource);

    console.log('\n=== Seeding Settings ===');
    await seedSettings(dataSource);

    console.log('\nSeeding completed successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeed();
