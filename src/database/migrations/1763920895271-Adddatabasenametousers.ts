import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Adddatabasenametousers1763920895271 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if database_name column already exists
    const table = await queryRunner.getTable('users');
    const databaseNameColumn = table?.findColumnByName('database_name');

    if (!databaseNameColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'database_name',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove database_name column
    const table = await queryRunner.getTable('users');
    const databaseNameColumn = table?.findColumnByName('database_name');

    if (databaseNameColumn) {
      await queryRunner.dropColumn('users', 'database_name');
    }
  }
}

