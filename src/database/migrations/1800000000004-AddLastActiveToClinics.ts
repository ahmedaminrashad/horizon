import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLastActiveToClinics1800000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'clinics',
      new TableColumn({
        name: 'last_active',
        type: 'datetime',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('clinics', 'last_active');
  }
}
