import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSpecialtyToDoctors1790000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (!table) {
      console.log('Table "doctors" does not exist, skipping migration');
      return;
    }

    // Check if specialty column already exists
    const specialtyColumn = table.findColumnByName('specialty');
    if (!specialtyColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'specialty',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (!table) {
      return;
    }

    const specialtyColumn = table.findColumnByName('specialty');
    if (specialtyColumn) {
      await queryRunner.dropColumn('doctors', 'specialty');
    }
  }
}
