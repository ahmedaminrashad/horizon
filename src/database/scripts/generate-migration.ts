import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

/**
 * Generate a main/original migration file
 * Usage: ts-node src/database/scripts/generate-migration.ts MigrationName
 */
async function generateMigration() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('Error: Migration name is required');
    console.log('Usage: npm run migration:generate <MigrationName>');
    console.log('Example: npm run migration:generate CreateUsersTable');
    process.exit(1);
  }

  // Generate timestamp
  const timestamp = Date.now();

  // Convert migration name to PascalCase if needed
  const className = migrationName
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Generate filename
  const filename = `${timestamp}-${className}.ts`;

  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const filePath = path.join(migrationsDir, filename);

  // Generate migration content
  const migrationContent = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${className}${timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your migration logic here
    // Example:
    // await queryRunner.createTable(
    //   new Table({
    //     name: 'example',
    //     columns: [
    //       {
    //         name: 'id',
    //         type: 'int',
    //         isPrimary: true,
    //         isGenerated: true,
    //         generationStrategy: 'increment',
    //       },
    //     ],
    //   }),
    // );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add your rollback logic here
    // Example:
    // await queryRunner.dropTable('example');
  }
}
`;

  try {
    // Write migration file
    fs.writeFileSync(filePath, migrationContent, 'utf8');
    console.log(`✓ Migration created: ${filename}`);
    console.log(`  Location: ${filePath}`);
    console.log(
      '\nNote: Make sure to configure TypeORM to use this migration file.',
    );
  } catch (error) {
    console.error('Error generating migration:', error);
    process.exit(1);
  }
}

generateMigration();
