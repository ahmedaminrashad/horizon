import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCitiesTable1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('cities');

    if (table) {
      console.log('Table "cities" already exists, skipping creation');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'cities',
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
            name: 'country_id',
            type: 'int',
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
            name: 'IDX_cities_country_id',
            columnNames: ['country_id'],
          },
          {
            name: 'IDX_cities_name_en',
            columnNames: ['name_en'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['country_id'],
            referencedTableName: 'countries',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('cities');

    if (table) {
      await queryRunner.dropTable('cities');
    }
  }
}

