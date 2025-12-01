import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateDoctorsTable1764000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'doctors',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'age',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'department',
            type: 'enum',
            enum: [
              'CARDIOLOGY',
              'NEUROLOGY',
              'ORTHOPEDICS',
              'PEDIATRICS',
              'DERMATOLOGY',
              'ONCOLOGY',
              'RADIOLOGY',
              'SURGERY',
              'INTERNAL_MEDICINE',
              'EMERGENCY',
              'OTHER',
            ],
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'clinic_id',
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
            name: 'IDX_doctors_user_id',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_doctors_clinic_id',
            columnNames: ['clinic_id'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
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
    await queryRunner.dropTable('doctors');
  }
}
