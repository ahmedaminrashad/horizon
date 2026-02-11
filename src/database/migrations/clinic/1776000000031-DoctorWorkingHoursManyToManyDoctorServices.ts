import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class DoctorWorkingHoursManyToManyDoctorServices1776000000031
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasOldColumn = table?.findColumnByName('doctor_service_id');

    // Create join table
    const joinTableExists = await queryRunner.hasTable(
      'doctor_working_hour_doctor_services_doctor_service',
    );
    if (!joinTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'doctor_working_hour_doctor_services_doctor_service',
          columns: [
            {
              name: 'doctor_working_hour_id',
              type: 'int',
              isPrimary: true,
            },
            {
              name: 'doctor_service_id',
              type: 'int',
              isPrimary: true,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'doctor_working_hour_doctor_services_doctor_service',
        new TableForeignKey({
          columnNames: ['doctor_working_hour_id'],
          referencedTableName: 'doctor_working_hours',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'doctor_working_hour_doctor_services_doctor_service',
        new TableForeignKey({
          columnNames: ['doctor_service_id'],
          referencedTableName: 'doctor_services',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    // Migrate existing doctor_service_id into join table
    if (hasOldColumn) {
      await queryRunner.query(`
        INSERT IGNORE INTO doctor_working_hour_doctor_services_doctor_service (doctor_working_hour_id, doctor_service_id)
        SELECT id, doctor_service_id FROM doctor_working_hours WHERE doctor_service_id IS NOT NULL
      `);
    }

    // Drop old column and FK
    if (hasOldColumn) {
      const updatedTable = await queryRunner.getTable('doctor_working_hours');
      const fk = updatedTable?.foreignKeys.find(
        (f) => f.columnNames.indexOf('doctor_service_id') !== -1,
      );
      if (fk) {
        await queryRunner.dropForeignKey('doctor_working_hours', fk);
      }
      await queryRunner.dropColumn('doctor_working_hours', 'doctor_service_id');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasJoinTable = await queryRunner.hasTable(
      'doctor_working_hour_doctor_services_doctor_service',
    );
    if (hasJoinTable) {
      const joinTable = await queryRunner.getTable(
        'doctor_working_hour_doctor_services_doctor_service',
      );
      const fks = joinTable?.foreignKeys ?? [];
      for (const fk of fks) {
        await queryRunner.dropForeignKey(
          'doctor_working_hour_doctor_services_doctor_service',
          fk,
        );
      }
      await queryRunner.dropTable(
        'doctor_working_hour_doctor_services_doctor_service',
      );
    }

    // Restore doctor_service_id column (optional - add back if needed for rollback)
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasColumn = table?.findColumnByName('doctor_service_id');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE doctor_working_hours ADD COLUMN doctor_service_id INT NULL
      `);
      await queryRunner.createForeignKey(
        'doctor_working_hours',
        new TableForeignKey({
          columnNames: ['doctor_service_id'],
          referencedTableName: 'doctor_services',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }
}
