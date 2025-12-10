import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAgeToDoctors1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    const hasAgeColumn = table?.findColumnByName('age');

    if (!hasAgeColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'age',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    const hasAgeColumn = table?.findColumnByName('age');

    if (hasAgeColumn) {
      await queryRunner.dropColumn('doctors', 'age');
    }
  }
}
