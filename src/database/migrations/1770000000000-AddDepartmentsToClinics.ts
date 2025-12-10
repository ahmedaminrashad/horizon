import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDepartmentsToClinics1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'clinics',
      new TableColumn({
        name: 'departments',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('clinics', 'departments');
  }
}
