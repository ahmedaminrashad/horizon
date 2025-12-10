import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateDoctorsTable1770000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (table) {
      console.log('Table "doctors" already exists, skipping creation');
      return;
    }

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
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'age',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'clinic_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'clinic_doctor_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'avatar',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '255',
            isNullable: true,
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
            isNullable: true,
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
            name: 'IDX_doctors_clinic_id',
            columnNames: ['clinic_id'],
          },
          {
            name: 'IDX_doctors_clinic_doctor_id',
            columnNames: ['clinic_doctor_id'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (table) {
      await queryRunner.dropTable('doctors');
    }
  }
}
