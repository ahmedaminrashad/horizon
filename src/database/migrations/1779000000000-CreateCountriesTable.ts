import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCountriesTable1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('countries');

    if (table) {
      console.log('Table "countries" already exists, skipping creation');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'countries',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'name_ar',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_countries_name_en',
            columnNames: ['name_en'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('countries');

    if (table) {
      await queryRunner.dropTable('countries');
    }
  }
}

