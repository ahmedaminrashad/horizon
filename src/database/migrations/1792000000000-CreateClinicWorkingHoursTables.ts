import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateClinicWorkingHoursTables1792000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create clinic_working_hours table
    await queryRunner.createTable(
      new Table({
        name: 'clinic_working_hours',
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
            name: 'range_order',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: 'Order/sequence for multiple ranges on the same day',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: 'Whether this working hour range is active',
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

    // Create index on clinic_id and day
    await queryRunner.createIndex(
      'clinic_working_hours',
      new TableIndex({
        name: 'IDX_clinic_working_hours_clinic_day',
        columnNames: ['clinic_id', 'day'],
      }),
    );

    // Create foreign key to clinics table
    await queryRunner.createForeignKey(
      'clinic_working_hours',
      new TableForeignKey({
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );

    // Create clinic_break_hours table
    await queryRunner.createTable(
      new Table({
        name: 'clinic_break_hours',
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
            name: 'start_time',
            type: 'time',
            isNullable: false,
            comment: 'Start time of break (e.g., 13:00:00)',
          },
          {
            name: 'end_time',
            type: 'time',
            isNullable: false,
            comment: 'End time of break (e.g., 14:00:00)',
          },
          {
            name: 'break_order',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: 'Order/sequence for multiple breaks on the same day',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: 'Whether this break is active',
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

    // Create index on clinic_id and day
    await queryRunner.createIndex(
      'clinic_break_hours',
      new TableIndex({
        name: 'IDX_clinic_break_hours_clinic_day',
        columnNames: ['clinic_id', 'day'],
      }),
    );

    // Create foreign key to clinics table
    await queryRunner.createForeignKey(
      'clinic_break_hours',
      new TableForeignKey({
        columnNames: ['clinic_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clinics',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clinic_break_hours');
    await queryRunner.dropTable('clinic_working_hours');
  }
}

