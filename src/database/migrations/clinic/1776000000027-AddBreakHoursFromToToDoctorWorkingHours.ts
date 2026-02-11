import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBreakHoursFromToToDoctorWorkingHours1776000000027
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctor_working_hours',
      new TableColumn({
        name: 'break_hours_from',
        type: 'time',
        isNullable: true,
        comment: 'Start time of break within this working hour (e.g., 13:00:00)',
      }),
    );
    await queryRunner.addColumn(
      'doctor_working_hours',
      new TableColumn({
        name: 'break_hours_to',
        type: 'time',
        isNullable: true,
        comment: 'End time of break within this working hour (e.g., 14:00:00)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctor_working_hours', 'break_hours_to');
    await queryRunner.dropColumn('doctor_working_hours', 'break_hours_from');
  }
}
