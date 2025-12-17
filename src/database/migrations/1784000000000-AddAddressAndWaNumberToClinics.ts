import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAddressAndWaNumberToClinics1784000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasAddressColumn = table?.findColumnByName('address');
    const hasWaNumberColumn = table?.findColumnByName('wa_number');

    if (!hasAddressColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'address',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    if (!hasWaNumberColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'wa_number',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasAddressColumn = table?.findColumnByName('address');
    const hasWaNumberColumn = table?.findColumnByName('wa_number');

    if (hasAddressColumn) {
      await queryRunner.dropColumn('clinics', 'address');
    }

    if (hasWaNumberColumn) {
      await queryRunner.dropColumn('clinics', 'wa_number');
    }
  }
}

