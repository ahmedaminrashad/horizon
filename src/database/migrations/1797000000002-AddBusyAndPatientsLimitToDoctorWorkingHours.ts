import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddBusyAndPatientsLimitToDoctorWorkingHours1797000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    
    // Add busy column
    const hasBusyColumn = table?.findColumnByName('busy');
    if (!hasBusyColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'busy',
          type: 'boolean',
          default: false,
          comment: 'Whether this working hour slot is busy',
        }),
      );
    }

    // Add patients_limit column
    const hasPatientsLimitColumn = table?.findColumnByName('patients_limit');
    if (!hasPatientsLimitColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'patients_limit',
          type: 'int',
          isNullable: true,
          comment: 'Maximum number of patients allowed for this slot. If null, no limit.',
        }),
      );
    }

    // Set patients_limit to 1 for all non-waterfall working hours
    await queryRunner.query(`
      UPDATE doctor_working_hours 
      SET patients_limit = 1 
      WHERE waterfall = false AND patients_limit IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    
    const hasBusyColumn = table?.findColumnByName('busy');
    if (hasBusyColumn) {
      await queryRunner.dropColumn('doctor_working_hours', 'busy');
    }

    const hasPatientsLimitColumn = table?.findColumnByName('patients_limit');
    if (hasPatientsLimitColumn) {
      await queryRunner.dropColumn('doctor_working_hours', 'patients_limit');
    }
  }
}

