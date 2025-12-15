import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdatePackagesCostToPrices1774000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the cost column
    await queryRunner.dropColumn('packages', 'cost');

    // Add price_monthly column
    await queryRunner.addColumn(
      'packages',
      new TableColumn({
        name: 'price_monthly',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
      }),
    );

    // Add price_annual column
    await queryRunner.addColumn(
      'packages',
      new TableColumn({
        name: 'price_annual',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new columns
    await queryRunner.dropColumn('packages', 'price_annual');
    await queryRunner.dropColumn('packages', 'price_monthly');

    // Restore the cost column
    await queryRunner.addColumn(
      'packages',
      new TableColumn({
        name: 'cost',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
      }),
    );
  }
}
