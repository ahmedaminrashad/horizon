import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDateOfBirthGenderSecondPhoneToDoctors1776000000024
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'date_of_birth',
        type: 'date',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'gender',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'second_phone',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    // Make age nullable so it can be computed from date_of_birth when provided
    await queryRunner.changeColumn(
      'doctors',
      'age',
      new TableColumn({
        name: 'age',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('doctors', 'second_phone');
    await queryRunner.dropColumn('doctors', 'gender');
    await queryRunner.dropColumn('doctors', 'date_of_birth');
    await queryRunner.changeColumn(
      'doctors',
      'age',
      new TableColumn({
        name: 'age',
        type: 'int',
        isNullable: false,
      }),
    );
  }
}
