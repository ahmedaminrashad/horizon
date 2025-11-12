import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Addnametousers1762807510007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if name column already exists
    const table = await queryRunner.getTable('users');
    const nameColumn = table?.findColumnByName('name');

    if (!nameColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'name',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove name column
    const table = await queryRunner.getTable('users');
    const nameColumn = table?.findColumnByName('name');

    if (nameColumn) {
      await queryRunner.dropColumn('users', 'name');
    }
  }
}
