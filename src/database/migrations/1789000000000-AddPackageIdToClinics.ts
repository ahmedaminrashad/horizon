import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddPackageIdToClinics1789000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasPackageIdColumn = table?.findColumnByName('package_id');

    if (!hasPackageIdColumn) {
      // First, add the column as nullable without default
      // This will set all existing rows to NULL automatically
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'package_id',
          type: 'int',
          isNullable: true,
        }),
      );

      // Ensure all existing rows are NULL (they should be already, but just to be safe)
      await queryRunner.query(
        `UPDATE clinics SET package_id = NULL WHERE package_id IS NULL`,
      );

      // Add index for better query performance
      await queryRunner.createIndex(
        'clinics',
        new TableIndex({
          name: 'IDX_clinics_package_id',
          columnNames: ['package_id'],
        }),
      );

      // Add foreign key constraint only if packages table exists
      const packagesTable = await queryRunner.getTable('packages');
      if (packagesTable) {
        await queryRunner.createForeignKey(
          'clinics',
          new TableForeignKey({
            columnNames: ['package_id'],
            referencedTableName: 'packages',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    const hasPackageIdColumn = table?.findColumnByName('package_id');

    if (hasPackageIdColumn) {
      // Drop foreign key first
      const table = await queryRunner.getTable('clinics');
      const foreignKey = table?.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('package_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('clinics', foreignKey);
      }

      // Drop index
      await queryRunner.dropIndex('clinics', 'IDX_clinics_package_id');

      // Drop column
      await queryRunner.dropColumn('clinics', 'package_id');
    }
  }
}

