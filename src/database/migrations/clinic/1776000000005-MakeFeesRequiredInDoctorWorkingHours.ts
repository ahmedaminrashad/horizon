import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class MakeFeesRequiredInDoctorWorkingHours1776000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const feesColumn = table?.findColumnByName('fees');

    // If fees column exists and is nullable, make it not nullable with default value
    if (feesColumn && feesColumn.isNullable) {
      // First, update any NULL values to 0
      await queryRunner.query(
        `UPDATE doctor_working_hours SET fees = 0 WHERE fees IS NULL`,
      );

      // Then alter the column to be not nullable with default
      await queryRunner.changeColumn(
        'doctor_working_hours',
        'fees',
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
    const feesColumn = table?.findColumnByName('fees');

    // Revert to nullable if needed
    if (feesColumn && !feesColumn.isNullable) {
      await queryRunner.changeColumn(
        'doctor_working_hours',
        'fees',
        new TableColumn({
          name: 'fees',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
          comment: 'Fees for this working hour slot',
        }),
      );
    }
  }
}

