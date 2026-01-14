import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RefactorPackagesRemoveTranslations1800000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('packages');

    if (!table) {
      console.log('Table "packages" does not exist, skipping migration');
      return;
    }

    // Drop package_translations table if it exists
    const translationsTable = await queryRunner.getTable('package_translations');
    if (translationsTable) {
      await queryRunner.dropTable('package_translations');
      console.log('Dropped package_translations table');
    }

    // Rename features to features_ar
    const featuresColumn = table.findColumnByName('features');
    const featuresArColumn = table.findColumnByName('features_ar');

    if (featuresColumn && !featuresArColumn) {
      await queryRunner.query(`
        ALTER TABLE packages 
        CHANGE COLUMN features features_ar JSON NULL
      `);
      console.log('Renamed features column to features_ar in packages table');
    } else if (!featuresColumn && !featuresArColumn) {
      // If features doesn't exist and features_ar doesn't exist, add features_ar
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'features_ar',
          type: 'json',
          isNullable: true,
        }),
      );
      console.log('Added features_ar column to packages table');
    }

    // Add features_en column
    const featuresEnColumn = table.findColumnByName('features_en');
    if (!featuresEnColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'features_en',
          type: 'json',
          isNullable: true,
        }),
      );
      console.log('Added features_en column to packages table');
    }

    // Add name_ar column
    const nameArColumn = table.findColumnByName('name_ar');
    if (!nameArColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'name_ar',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
      console.log('Added name_ar column to packages table');
    }

    // Add name_en column
    const nameEnColumn = table.findColumnByName('name_en');
    if (!nameEnColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'name_en',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
      console.log('Added name_en column to packages table');
    }

    // Add content_ar column
    const contentArColumn = table.findColumnByName('content_ar');
    if (!contentArColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'content_ar',
          type: 'text',
          isNullable: true,
        }),
      );
      console.log('Added content_ar column to packages table');
    }

    // Add content_en column
    const contentEnColumn = table.findColumnByName('content_en');
    if (!contentEnColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'content_en',
          type: 'text',
          isNullable: true,
        }),
      );
      console.log('Added content_en column to packages table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('packages');

    if (!table) {
      console.log('Table "packages" does not exist, skipping rollback');
      return;
    }

    // Remove added columns
    const nameArColumn = table.findColumnByName('name_ar');
    if (nameArColumn) {
      await queryRunner.dropColumn('packages', 'name_ar');
    }

    const nameEnColumn = table.findColumnByName('name_en');
    if (nameEnColumn) {
      await queryRunner.dropColumn('packages', 'name_en');
    }

    const contentArColumn = table.findColumnByName('content_ar');
    if (contentArColumn) {
      await queryRunner.dropColumn('packages', 'content_ar');
    }

    const contentEnColumn = table.findColumnByName('content_en');
    if (contentEnColumn) {
      await queryRunner.dropColumn('packages', 'content_en');
    }

    const featuresEnColumn = table.findColumnByName('features_en');
    if (featuresEnColumn) {
      await queryRunner.dropColumn('packages', 'features_en');
    }

    // Rename features_ar back to features
    const featuresArColumn = table.findColumnByName('features_ar');
    if (featuresArColumn) {
      await queryRunner.query(`
        ALTER TABLE packages 
        CHANGE COLUMN features_ar features JSON NULL
      `);
    }

    // Note: package_translations table recreation would require data migration
    // which is complex, so we skip it in the down method
    console.log('Rolled back packages table changes');
  }
}
