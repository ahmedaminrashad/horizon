import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBioToClinics1788000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasBioColumn = table?.findColumnByName('bio');

    if (!hasBioColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'bio',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasBioColumn = table?.findColumnByName('bio');

    if (hasBioColumn) {
      await queryRunner.dropColumn('clinics', 'bio');
    }
  }
}


