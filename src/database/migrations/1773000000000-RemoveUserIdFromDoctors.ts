import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveUserIdFromDoctors1773000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    const hasUserIdColumn = table?.findColumnByName('user_id');

    if (hasUserIdColumn) {
      // Query database directly to find foreign key constraint names
      const databaseName = queryRunner.connection.options.database;
      const foreignKeyResults = await queryRunner.query(
        `SELECT CONSTRAINT_NAME 
         FROM information_schema.KEY_COLUMN_USAGE 
         WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'doctors' 
         AND COLUMN_NAME = 'user_id' 
         AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [databaseName],
      );

      // Drop all foreign key constraints found
      for (const fk of foreignKeyResults) {
        try {
          await queryRunner.query(
            `ALTER TABLE \`doctors\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
          );
        } catch (error) {
          console.warn(
            `Could not drop foreign key ${fk.CONSTRAINT_NAME}:`,
            error,
          );
        }
      }

      // Drop index on user_id if it exists
      const indexResults = await queryRunner.query(
        `SELECT INDEX_NAME 
         FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'doctors' 
         AND COLUMN_NAME = 'user_id' 
         AND INDEX_NAME != 'PRIMARY'`,
        [databaseName],
      );

      for (const idx of indexResults) {
        try {
          await queryRunner.query(
            `DROP INDEX \`${idx.INDEX_NAME}\` ON \`doctors\``,
          );
        } catch (error) {
          console.warn(`Could not drop index ${idx.INDEX_NAME}:`, error);
        }
      }

      // Now drop the column using raw SQL
      try {
        await queryRunner.query(
          `ALTER TABLE \`doctors\` DROP COLUMN \`user_id\``,
        );
      } catch (error) {
        console.warn('Could not drop user_id column:', error);
        throw error;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');
    const hasUserIdColumn = table?.findColumnByName('user_id');

    if (!hasUserIdColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'user_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }
}
