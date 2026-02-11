import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AppointmentTypesArrayOnDoctors1776000000026
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add appointment_types as comma-separated (simple-array)
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'appointment_types',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Comma-separated: in-clinic, online, home',
      }),
    );

    // Migrate existing appoint_type into appointment_types
    await queryRunner.query(`
      UPDATE doctors SET appointment_types = appoint_type WHERE appoint_type IS NOT NULL
    `);

    // Drop old column
    await queryRunner.dropColumn('doctors', 'appoint_type');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'appoint_type',
        type: 'enum',
        enum: ['in-clinic', 'online', 'home'],
        isNullable: true,
      }),
    );
    // Set first value from appointment_types back to appoint_type
    await queryRunner.query(`
      UPDATE doctors
      SET appoint_type = TRIM(SUBSTRING_INDEX(COALESCE(appointment_types, ''), ',', 1))
      WHERE appointment_types IS NOT NULL AND appointment_types != ''
    `);
    await queryRunner.dropColumn('doctors', 'appointment_types');
  }
}
