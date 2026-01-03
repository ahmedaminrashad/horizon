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
        `SELECT kcu.CONSTRAINT_NAME 
         FROM information_schema.KEY_COLUMN_USAGE kcu
         INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
           ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
           AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
         WHERE kcu.TABLE_SCHEMA = ? 
         AND kcu.TABLE_NAME = 'doctors' 
         AND kcu.COLUMN_NAME = 'user_id' 
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`,
        [databaseName],
      );

      // Drop all foreign key constraints found
      for (const fk of foreignKeyResults) {
        try {
          // Verify the foreign key still exists before attempting to drop
          const fkExists = await queryRunner.query(
            `SELECT COUNT(*) as count
             FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = ?
             AND CONSTRAINT_NAME = ?`,
            [databaseName, fk.CONSTRAINT_NAME],
          );

          const count = fkExists && fkExists[0] ? Number(fkExists[0].count) : 0;
          if (count > 0) {
            await queryRunner.query(
              `ALTER TABLE \`doctors\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
            );
          }
        } catch (error) {
          // Silently ignore if foreign key doesn't exist (error 1091 in MySQL)
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCode = (error as any)?.code || '';
          if (
            !errorMessage.includes("check that it exists") &&
            errorCode !== 'ER_CANT_DROP_FIELD_OR_KEY'
          ) {
            console.warn(
              `Could not drop foreign key ${fk.CONSTRAINT_NAME}:`,
              error,
            );
          }
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
