import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddAppointTypeToReservations1776000000010
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    
    // Add appoint_type column
    const hasAppointTypeColumn = table?.findColumnByName('appoint_type');
    if (!hasAppointTypeColumn) {
      await queryRunner.addColumn(
        'reservations',
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
    const table = await queryRunner.getTable('reservations');
    
    const hasAppointTypeColumn = table?.findColumnByName('appoint_type');
    if (hasAppointTypeColumn) {
      await queryRunner.dropColumn('reservations', 'appoint_type');
    }
  }
}
