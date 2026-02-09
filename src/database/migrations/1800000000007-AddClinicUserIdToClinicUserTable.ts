import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddClinicUserIdToClinicUserTable1800000000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinic_user');
    if (table && !table.findColumnByName('clinic_user_id')) {
      await queryRunner.addColumn(
        'clinic_user',
        new TableColumn({
          name: 'clinic_user_id',
          type: 'int',
          isNullable: true,
        }),
      );
      await queryRunner.createIndex(
        'clinic_user',
        new TableIndex({
          name: 'IDX_clinic_user_clinic_user_id',
          columnNames: ['clinic_user_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinic_user');
    if (table) {
      const index = table.indices.find(
        (idx) => idx.name === 'IDX_clinic_user_clinic_user_id',
      );
      if (index) {
        await queryRunner.dropIndex('clinic_user', index);
      }
      const column = table.findColumnByName('clinic_user_id');
      if (column) {
        await queryRunner.dropColumn('clinic_user', 'clinic_user_id');
      }
    }
  }
}
