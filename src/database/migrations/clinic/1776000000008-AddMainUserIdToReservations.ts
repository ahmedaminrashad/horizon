import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddMainUserIdToReservations1776000000008
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    const hasColumn = table?.findColumnByName('main_user_id');

    // Add main_user_id column if it doesn't exist
    if (!hasColumn) {
      await queryRunner.addColumn(
        'reservations',
        new TableColumn({
          name: 'main_user_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    if (!table) {
      return;
    }

    const hasColumn = table.findColumnByName('main_user_id');

    if (hasColumn) {
      await queryRunner.dropColumn('reservations', 'main_user_id');
    }
  }
}
