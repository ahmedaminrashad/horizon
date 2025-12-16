import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOwnerToClinics1782000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasOwnerColumn = table?.findColumnByName('owner');

    if (!hasOwnerColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'owner',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasOwnerColumn = table?.findColumnByName('owner');

    if (hasOwnerColumn) {
      await queryRunner.dropColumn('clinics', 'owner');
    }
  }
}

