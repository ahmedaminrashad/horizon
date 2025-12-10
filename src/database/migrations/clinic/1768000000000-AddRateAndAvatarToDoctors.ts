import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRateAndAvatarToDoctors1768000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'rate',
        type: 'decimal',
        precision: 3,
        scale: 2,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'avatar',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctors', 'avatar');
    await queryRunner.dropColumn('doctors', 'rate');
  }
}
