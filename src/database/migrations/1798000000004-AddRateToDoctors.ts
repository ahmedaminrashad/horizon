import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddRateToDoctors1798000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    
    // Add rate column
    const hasRateColumn = table?.findColumnByName('rate');
    if (!hasRateColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'rate',
          type: 'decimal',
          precision: 3,
          scale: 2,
          isNullable: true,
          comment: 'Doctor rating (0.00 to 5.00)',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    
    const hasRateColumn = table?.findColumnByName('rate');
    if (hasRateColumn) {
      await queryRunner.dropColumn('doctors', 'rate');
    }
  }
}
