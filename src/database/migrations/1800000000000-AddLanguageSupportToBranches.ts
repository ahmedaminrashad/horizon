import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLanguageSupportToBranches1800000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('branches');

    if (!table) {
      console.log('Table "branches" does not exist, skipping migration');
      return;
    }

    // Check if name column exists and rename it to name_ar
    const nameColumn = table.findColumnByName('name');
    const nameArColumn = table.findColumnByName('name_ar');

    if (nameColumn && !nameArColumn) {
      // Rename name to name_ar
      await queryRunner.query(`
        ALTER TABLE branches 
        CHANGE COLUMN name name_ar VARCHAR(255) NOT NULL
      `);
      console.log('Renamed name column to name_ar in branches table');
    } else if (!nameColumn && !nameArColumn) {
      // If name doesn't exist and name_ar doesn't exist, add name_ar
      await queryRunner.addColumn(
        'branches',
        new TableColumn({
          name: 'name_ar',
          type: 'varchar',
          length: '255',
          isNullable: false,
        }),
      );
      console.log('Added name_ar column to branches table');
    }

    // Check if name_en column exists and add it if not
    const nameEnColumn = table.findColumnByName('name_en');
    if (!nameEnColumn) {
      await queryRunner.addColumn(
        'branches',
        new TableColumn({
          name: 'name_en',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
      console.log('Added name_en column to branches table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('branches');

    if (!table) {
      return;
    }

    // Remove name_en column if it exists
    const nameEnColumn = table.findColumnByName('name_en');
    if (nameEnColumn) {
      await queryRunner.dropColumn('branches', 'name_en');
      console.log('Removed name_en column from branches table');
    }

    // Rename name_ar back to name
    const nameArColumn = table.findColumnByName('name_ar');
    const nameColumn = table.findColumnByName('name');

    if (nameArColumn && !nameColumn) {
      await queryRunner.query(`
        ALTER TABLE branches 
        CHANGE COLUMN name_ar name VARCHAR(255) NOT NULL
      `);
      console.log('Renamed name_ar column back to name in branches table');
    } else if (!nameArColumn && !nameColumn) {
      // If name_ar doesn't exist and name doesn't exist, add name
      await queryRunner.addColumn(
        'branches',
        new TableColumn({
          name: 'name',
          type: 'varchar',
          length: '255',
          isNullable: false,
        }),
      );
      console.log('Added name column to branches table');
    }
  }
}
