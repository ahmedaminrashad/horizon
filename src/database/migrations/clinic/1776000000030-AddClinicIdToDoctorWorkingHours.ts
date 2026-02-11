import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddClinicIdToDoctorWorkingHours1776000000030
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasColumn = table?.findColumnByName('clinic_id');

    if (!hasColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'clinic_id',
          type: 'int',
          isNullable: true,
        }),
      );

      await queryRunner.query(`
        UPDATE doctor_working_hours wh
        INNER JOIN doctors d ON d.id = wh.doctor_id
        SET wh.clinic_id = d.clinic_id
      `);

      await queryRunner.query(
        `ALTER TABLE doctor_working_hours MODIFY COLUMN clinic_id INT NOT NULL`,
      );

      const updatedTable = await queryRunner.getTable('doctor_working_hours');
      const hasIndex = updatedTable?.indices.some(
        (idx) => idx.name === 'IDX_doctor_working_hours_clinic_id',
      );
      if (!hasIndex) {
        await queryRunner.createIndex(
          'doctor_working_hours',
          new TableIndex({
            name: 'IDX_doctor_working_hours_clinic_id',
            columnNames: ['clinic_id'],
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasColumn = table?.findColumnByName('clinic_id');
    if (hasColumn) {
      await queryRunner.dropIndex(
        'doctor_working_hours',
        'IDX_doctor_working_hours_clinic_id',
      );
      await queryRunner.dropColumn('doctor_working_hours', 'clinic_id');
    }
  }
}
