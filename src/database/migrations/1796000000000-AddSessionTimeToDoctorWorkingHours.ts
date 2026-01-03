import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddSessionTimeToDoctorWorkingHours1796000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasSessionTimeColumn = table?.findColumnByName('session_time');

    // Add session_time column to doctor_working_hours table if it doesn't exist
    if (!hasSessionTimeColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'session_time',
          type: 'time',
          isNullable: true,
          comment: 'Session duration (e.g., 00:30:00 for 30 minutes)',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasSessionTimeColumn = table?.findColumnByName('session_time');

    if (hasSessionTimeColumn) {
      await queryRunner.dropColumn('doctor_working_hours', 'session_time');
    }
  }
}

