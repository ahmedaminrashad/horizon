import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddAppointTypeToDoctorWorkingHours1798000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    
    // Add appoint_type column
    const hasAppointTypeColumn = table?.findColumnByName('appoint_type');
    if (!hasAppointTypeColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'appoint_type',
          type: 'enum',
          enum: ['in-clinic', 'online', 'home'],
          isNullable: true,
          comment: 'Appointment type: in-clinic, online, or home',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    
    const hasAppointTypeColumn = table?.findColumnByName('appoint_type');
    if (hasAppointTypeColumn) {
      await queryRunner.dropColumn('doctor_working_hours', 'appoint_type');
    }
  }
}
