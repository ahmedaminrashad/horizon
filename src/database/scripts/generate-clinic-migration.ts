import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface } from 'typeorm';

// Load environment variables
config();

/**
 * Generate a clinic migration file
 * Usage: ts-node src/database/scripts/generate-clinic-migration.ts MigrationName
 */
async function generateClinicMigration() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error('Error: Migration name is required');
    console.log('Usage: npm run migration:generate:clinic <MigrationName>');
    console.log(
      'Example: npm run migration:generate:clinic CreatePatientsTable',
    );
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
  const filePath = path.join(__dirname, '../migrations/clinic', filename);

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
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write migration file
    fs.writeFileSync(filePath, migrationContent, 'utf8');
    console.log(`✓ Clinic migration created: ${filename}`);
    console.log(`  Location: ${filePath}`);

    // Update migrations-list.ts
    updateMigrationsList(className, timestamp, filename);
  } catch (error) {
    console.error('Error generating migration:', error);
    process.exit(1);
  }
}

/**
 * Update migrations-list.ts to include the new migration
 */
function updateMigrationsList(
  className: string,
  timestamp: number,
  filename: string,
) {
  const migrationsListPath = path.join(
    __dirname,
    '../migrations/clinic/migrations-list.ts',
  );

  try {
    let content = fs.readFileSync(migrationsListPath, 'utf8');

    // Add import statement
    const importStatement = `import { ${className}${timestamp} } from './${filename.replace('.ts', '')}';\n`;

    // Check if import already exists
    if (!content.includes(`import { ${className}${timestamp}`)) {
      // Find the last import statement
      const lastImportIndex = content.lastIndexOf('import');
      const nextLineAfterImport = content.indexOf('\n', lastImportIndex);

      if (nextLineAfterImport !== -1) {
        content =
          content.slice(0, nextLineAfterImport + 1) +
          importStatement +
          content.slice(nextLineAfterImport + 1);
      } else {
        content = importStatement + content;
      }
    }

    // Add to migrations array
    const migrationsArrayPattern =
      /export const clinicMigrations[^[]*\[([\s\S]*?)\];/;
    const match = content.match(migrationsArrayPattern);

    if (match) {
      const migrationsList = match[1].trim();
      const newMigrationEntry = `${className}${timestamp}`;

      // Check if migration already exists in the array
      if (!migrationsList.includes(newMigrationEntry)) {
        // Add migration to the array (maintaining proper formatting)
        let updatedList = migrationsList;
        if (updatedList) {
          // Remove trailing comma and whitespace
          updatedList = updatedList.replace(/,\s*$/, '').trim();
          updatedList += ',\n  ' + newMigrationEntry;
        } else {
          updatedList = newMigrationEntry;
        }

        // Ensure MigrationInterface import exists
        if (!content.includes('import { MigrationInterface }')) {
          const firstImportIndex = content.indexOf('import');
          const firstImportLine = content.indexOf('\n', firstImportIndex);
          content =
            content.slice(0, firstImportLine + 1) +
            "import { MigrationInterface } from 'typeorm';\n" +
            content.slice(firstImportLine + 1);
        }

        content = content.replace(
          migrationsArrayPattern,
          `export const clinicMigrations: (new () => MigrationInterface)[] = [\n  ${updatedList}\n];`,
        );
      }
    }

    fs.writeFileSync(migrationsListPath, content, 'utf8');
    console.log(`✓ Updated migrations-list.ts`);
  } catch (error) {
    console.warn('Warning: Could not update migrations-list.ts:', error);
    console.log('Please manually add the migration to migrations-list.ts:');
    console.log(
      `  import { ${className}${timestamp} } from './${filename.replace('.ts', '')}';`,
    );
    console.log(
      `  // Add ${className}${timestamp} to the clinicMigrations array`,
    );
  }
}

generateClinicMigration();
