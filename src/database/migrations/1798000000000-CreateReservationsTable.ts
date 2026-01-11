import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateReservationsTable1798000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');

    if (table) {
      console.log('Table "reservations" already exists, skipping creation');
      await queryRunner.dropTable('reservations');
    }

    await queryRunner.createTable(
      new Table({
        name: 'reservations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'clinic_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'clinic_reservation_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'doctor_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'main_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'doctor_working_hour_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'fees',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'paid',
            type: 'boolean',
            default: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'taken', 'scheduled', 'cancelled'],
            default: "'pending'",
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
            name: 'IDX_reservations_clinic_id',
            columnNames: ['clinic_id'],
          },
          {
            name: 'IDX_reservations_clinic_reservation_id',
            columnNames: ['clinic_reservation_id'],
          },
          {
            name: 'IDX_reservations_doctor_id',
            columnNames: ['doctor_id'],
          },
          {
            name: 'IDX_reservations_main_user_id',
            columnNames: ['main_user_id'],
          },
          {
            name: 'IDX_reservations_date',
            columnNames: ['date'],
          },
          {
            name: 'IDX_reservations_status',
            columnNames: ['status'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['doctor_id'],
            referencedTableName: 'doctors',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            columnNames: ['main_user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');

    if (table) {
      await queryRunner.dropTable('reservations');
    }
  }
}
