import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExtensionNumberToClinics1800000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'clinics',
      new TableColumn({
        name: 'extension_number',
        type: 'varchar',
        length: '20',
        isUnique: true,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('clinics', 'extension_number');
  }
}
