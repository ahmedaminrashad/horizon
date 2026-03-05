import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToUsers1776000000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('is_active');

    if (!column) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'is_active',
          type: 'boolean',
          default: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('is_active');

    if (column) {
      await queryRunner.dropColumn('users', 'is_active');
    }
  }
}
