import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDoctorWorkingHoursTable1793000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'doctor_working_hours',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'doctor_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'day',
            type: 'enum',
            enum: [
              'MONDAY',
              'TUESDAY',
              'WEDNESDAY',
              'THURSDAY',
              'FRIDAY',
              'SATURDAY',
              'SUNDAY',
            ],
            isNullable: false,
          },
          {
            name: 'branch_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'start_time',
            type: 'time',
            isNullable: false,
            comment: 'Start time of working hours (e.g., 09:00:00)',
          },
          {
            name: 'end_time',
            type: 'time',
            isNullable: false,
            comment: 'End time of working hours (e.g., 17:00:00)',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: 'Whether this working hour is active',
          },
          {
            name: 'waterfall',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: 'Waterfall scheduling: if true, appointments cascade to next available slot',
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
      }),
      true,
    );

    // Create foreign key for doctor_id
    await queryRunner.createForeignKey(
      'doctor_working_hours',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'doctors',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for faster queries
    await queryRunner.createIndex(
      'doctor_working_hours',
      new TableIndex({
        name: 'IDX_doctor_working_hours_doctor_day',
        columnNames: ['doctor_id', 'day'],
      }),
    );

    await queryRunner.createIndex(
      'doctor_working_hours',
      new TableIndex({
        name: 'IDX_doctor_working_hours_branch',
        columnNames: ['branch_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('doctor_working_hours');
  }
}

