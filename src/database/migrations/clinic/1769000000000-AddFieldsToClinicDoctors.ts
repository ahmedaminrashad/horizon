import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFieldsToClinicDoctors1769000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add license_number column
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'license_number',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add degree column
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'degree',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add languages column (stored as text, can be JSON or comma-separated)
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'languages',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add bio column
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'bio',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add appoint_type enum column
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'appoint_type',
        type: 'enum',
        enum: ['in-clinic', 'online', 'home'],
        isNullable: true,
      }),
    );

    // Add is_active column
    await queryRunner.addColumn(
      'doctors',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new columns
    await queryRunner.dropColumn('doctors', 'is_active');
    await queryRunner.dropColumn('doctors', 'appoint_type');
    await queryRunner.dropColumn('doctors', 'bio');
    await queryRunner.dropColumn('doctors', 'languages');
    await queryRunner.dropColumn('doctors', 'degree');
    await queryRunner.dropColumn('doctors', 'license_number');
  }
}
