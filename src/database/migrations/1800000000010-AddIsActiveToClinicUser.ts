import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToClinicUser1800000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinic_user');
    if (table && !table.findColumnByName('is_active')) {
      await queryRunner.addColumn(
        'clinic_user',
        new TableColumn({
          name: 'is_active',
          type: 'boolean',
          default: true,
          isNullable: false,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinic_user');
    if (table?.findColumnByName('is_active')) {
      await queryRunner.dropColumn('clinic_user', 'is_active');
    }
  }
}
