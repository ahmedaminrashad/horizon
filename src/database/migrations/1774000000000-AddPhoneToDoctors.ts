import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneToDoctors1774000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    const hasPhoneColumn = table?.findColumnByName('phone');

    if (!hasPhoneColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'phone',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    const hasPhoneColumn = table?.findColumnByName('phone');

    if (hasPhoneColumn) {
      await queryRunner.dropColumn('doctors', 'phone');
    }
  }
}
