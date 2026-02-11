import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddClinicIdToDoctorWorkingHours1800000000008
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasClinicIdColumn = table?.findColumnByName('clinic_id');

    if (!hasClinicIdColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'clinic_id',
          type: 'int',
          isNullable: true,
        }),
      );

      // Backfill from doctors table
      await queryRunner.query(`
        UPDATE doctor_working_hours wh
        INNER JOIN doctors d ON d.id = wh.doctor_id
        SET wh.clinic_id = d.clinic_id
      `);

      // Make column NOT NULL
      await queryRunner.query(
        `ALTER TABLE doctor_working_hours MODIFY COLUMN clinic_id INT NOT NULL`,
      );

      await queryRunner.createForeignKey(
        'doctor_working_hours',
        new TableForeignKey({
          columnNames: ['clinic_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'clinics',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createIndex(
        'doctor_working_hours',
        new TableIndex({
          name: 'IDX_doctor_working_hours_clinic_id',
          columnNames: ['clinic_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const fk = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('clinic_id') !== -1,
    );
    if (fk) {
      await queryRunner.dropForeignKey('doctor_working_hours', fk);
    }
    await queryRunner.dropIndex(
      'doctor_working_hours',
      'IDX_doctor_working_hours_clinic_id',
    );
    await queryRunner.dropColumn('doctor_working_hours', 'clinic_id');
  }
}
