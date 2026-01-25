import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeactivateReasonToClinics1800000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'clinics',
      new TableColumn({
        name: 'deactivate_reason',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('clinics', 'deactivate_reason');
  }
}
