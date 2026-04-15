import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFeesToDoctorBranches1776000000039
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_branches');
    if (!table) {
      console.log('Table "doctor_branches" does not exist, skipping migration');
      return;
    }

    if (!table.findColumnByName('fees')) {
      await queryRunner.addColumn(
        'doctor_branches',
        new TableColumn({
          name: 'fees',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
          comment: 'Optional default/session fee for this doctor at this branch',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = await queryRunner.getTable('doctor_branches');
    if (t?.findColumnByName('fees')) {
      await queryRunner.dropColumn('doctor_branches', 'fees');
    }
  }
}
