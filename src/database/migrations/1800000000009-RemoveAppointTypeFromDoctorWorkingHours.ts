import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAppointTypeFromDoctorWorkingHours1800000000009
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasColumn = table?.findColumnByName('appoint_type');
    if (hasColumn) {
      await queryRunner.dropColumn('doctor_working_hours', 'appoint_type');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE doctor_working_hours
      ADD COLUMN appoint_type ENUM('in-clinic', 'online', 'home') NULL
    `);
  }
}
