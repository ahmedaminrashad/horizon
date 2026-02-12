import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWaterfallToServices1776000000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');
    const hasColumn = table?.findColumnByName('waterfall');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'services',
        new TableColumn({
          name: 'waterfall',
          type: 'boolean',
          default: true,
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');
    const hasColumn = table?.findColumnByName('waterfall');
    if (hasColumn) {
      await queryRunner.dropColumn('services', 'waterfall');
    }
  }
}
