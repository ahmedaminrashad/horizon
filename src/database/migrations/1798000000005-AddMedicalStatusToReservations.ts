import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddMedicalStatusToReservations1798000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');

    const hasMedicalStatusColumn = table?.findColumnByName('medical_status');
    if (!hasMedicalStatusColumn) {
      await queryRunner.addColumn(
        'reservations',
        new TableColumn({
          name: 'medical_status',
          type: 'enum',
          enum: ['Confirmed', 'Suspected', 'MisDiagnosis'],
          isNullable: true,
          comment: 'Medical status: Confirmed, Suspected, MisDiagnosis',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');

    const hasMedicalStatusColumn = table?.findColumnByName('medical_status');
    if (hasMedicalStatusColumn) {
      await queryRunner.dropColumn('reservations', 'medical_status');
    }
  }
}
