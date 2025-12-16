import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToClinics1777000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasIsActiveColumn = table?.findColumnByName('is_active');

    if (!hasIsActiveColumn) {
      await queryRunner.addColumn(
        'clinics',
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
    const table = await queryRunner.getTable('clinics');
    const hasIsActiveColumn = table?.findColumnByName('is_active');

    if (hasIsActiveColumn) {
      await queryRunner.dropColumn('clinics', 'is_active');
    }
  }
}

