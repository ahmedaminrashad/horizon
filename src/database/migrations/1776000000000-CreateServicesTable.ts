import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateServicesTable1776000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');

    if (table) {
      console.log('Table "services" already exists, skipping creation');
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'services',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'clinic_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'clinic_service_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'specialty',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'degree',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'consultation',
              'follow-up',
              'online consultation',
              'home visit',
            ],
            isNullable: true,
          },
          {
            name: 'default_duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'default_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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
            name: 'IDX_services_clinic_id',
            columnNames: ['clinic_id'],
          },
          {
            name: 'IDX_services_clinic_service_id',
            columnNames: ['clinic_service_id'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');

    if (table) {
      await queryRunner.dropTable('services');
    }
  }
}
