import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsFeaturedToPackages1778000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('packages');
    const hasIsFeaturedColumn = table?.findColumnByName('is_featured');

    if (!hasIsFeaturedColumn) {
      await queryRunner.addColumn(
        'packages',
        new TableColumn({
          name: 'is_featured',
          type: 'boolean',
          default: false,
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('packages');
    const hasIsFeaturedColumn = table?.findColumnByName('is_featured');

    if (hasIsFeaturedColumn) {
      await queryRunner.dropColumn('packages', 'is_featured');
    }
  }
}

