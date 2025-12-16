import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFeaturesToPackages1783000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('packages');
    const hasFeaturesColumn = table?.findColumnByName('features');

    if (!hasFeaturesColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'features',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('packages');
    const hasFeaturesColumn = table?.findColumnByName('features');

    if (hasFeaturesColumn) {
      await queryRunner.dropColumn('packages', 'features');
    }
  }
}

