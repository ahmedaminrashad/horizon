import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDepartmentsToClinics1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasDepartmentsColumn = table?.findColumnByName('departments');

    if (!hasDepartmentsColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'departments',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasDepartmentsColumn = table?.findColumnByName('departments');

    if (hasDepartmentsColumn) {
      await queryRunner.dropColumn('clinics', 'departments');
    }
  }
}
