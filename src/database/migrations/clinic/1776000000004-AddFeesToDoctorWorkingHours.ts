import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddFeesToDoctorWorkingHours1776000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasFeesColumn = table?.findColumnByName('fees');

    // Add fees column to doctor_working_hours table if it doesn't exist
    if (!hasFeesColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'fees',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: false,
          default: 0,
          comment: 'Fees for this working hour slot',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasFeesColumn = table?.findColumnByName('fees');

    if (hasFeesColumn) {
      await queryRunner.dropColumn('doctor_working_hours', 'fees');
    }
  }
}

