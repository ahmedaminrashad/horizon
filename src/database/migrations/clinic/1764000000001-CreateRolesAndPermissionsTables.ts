import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRolesAndPermissionsTables1764000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if permissions table already exists
    const permissionsTableExists = await queryRunner.hasTable('permissions');

    if (!permissionsTableExists) {
      // Create permissions table
      await queryRunner.createTable(
        new Table({
          name: 'permissions',
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
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'slug',
              type: 'varchar',
              length: '255',
              isUnique: true,
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
        }),
        true,
      );

      // Create indexes for permissions
      await queryRunner.createIndex(
        'permissions',
        new TableIndex({
          name: 'IDX_permissions_slug',
          columnNames: ['slug'],
          isUnique: true,
        }),
      );

      await queryRunner.createIndex(
        'permissions',
        new TableIndex({
          name: 'IDX_permissions_name',
          columnNames: ['name'],
          isUnique: true,
        }),
      );

      console.log('Permissions table created successfully');
    } else {
      console.log('Permissions table already exists');
    }

    // Check if roles table already exists
    const rolesTableExists = await queryRunner.hasTable('roles');

    if (!rolesTableExists) {
      // Create roles table
      await queryRunner.createTable(
        new Table({
          name: 'roles',
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
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'slug',
              type: 'varchar',
              length: '255',
              isUnique: true,
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
        }),
        true,
      );

      // Create indexes for roles
      await queryRunner.createIndex(
        'roles',
        new TableIndex({
          name: 'IDX_roles_slug',
          columnNames: ['slug'],
          isUnique: true,
        }),
      );

      await queryRunner.createIndex(
        'roles',
        new TableIndex({
          name: 'IDX_roles_name',
          columnNames: ['name'],
          isUnique: true,
        }),
      );

      console.log('Roles table created successfully');
    } else {
      console.log('Roles table already exists');
    }

    // Check if role_permissions junction table already exists
    const rolePermissionsTableExists = await queryRunner.hasTable(
      'role_permissions',
    );

    if (!rolePermissionsTableExists) {
      // Create role_permissions junction table
      await queryRunner.createTable(
        new Table({
          name: 'role_permissions',
          columns: [
            {
              name: 'role_id',
              type: 'int',
              isPrimary: true,
            },
            {
              name: 'permission_id',
              type: 'int',
              isPrimary: true,
            },
          ],
        }),
        true,
      );

      // Create foreign key for role_id
      await queryRunner.createForeignKey(
        'role_permissions',
        new TableForeignKey({
          columnNames: ['role_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'roles',
          onDelete: 'CASCADE',
        }),
      );

      // Create foreign key for permission_id
      await queryRunner.createForeignKey(
        'role_permissions',
        new TableForeignKey({
          columnNames: ['permission_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'permissions',
          onDelete: 'CASCADE',
        }),
      );

      // Create composite index
      await queryRunner.createIndex(
        'role_permissions',
        new TableIndex({
          name: 'IDX_role_permissions_composite',
          columnNames: ['role_id', 'permission_id'],
          isUnique: true,
        }),
      );

      console.log('Role_permissions junction table created successfully');
    } else {
      console.log('Role_permissions table already exists');
    }

    // Add role_id column to users table if it doesn't exist
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const roleIdColumn = usersTable.findColumnByName('role_id');
      if (!roleIdColumn) {
        await queryRunner.query(`
          ALTER TABLE \`users\` 
          ADD COLUMN \`role_id\` INT NULL
        `);

        // Check if foreign key already exists before creating
        const existingForeignKeys = usersTable.foreignKeys.filter(
          (fk) =>
            fk.columnNames.includes('role_id') &&
            fk.referencedTableName === 'roles',
        );

        // Add foreign key for role_id only if it doesn't exist
        if (existingForeignKeys.length === 0) {
          try {
            await queryRunner.createForeignKey(
              'users',
              new TableForeignKey({
                columnNames: ['role_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'roles',
                onDelete: 'SET NULL',
              }),
            );
          } catch (error) {
            // Ignore if foreign key already exists
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              !errorMessage.includes('Duplicate foreign key') &&
              !errorMessage.includes('already exists')
            ) {
              throw error;
            }
          }
        }

        // Add index for role_id (check if it exists first)
        const existingIndex = usersTable.indices.find(
          (idx) => idx.name === 'IDX_users_role_id',
        );
        if (!existingIndex) {
          await queryRunner.createIndex(
            'users',
            new TableIndex({
              name: 'IDX_users_role_id',
              columnNames: ['role_id'],
            }),
          );
        }

        console.log('Added role_id column to users table');
      } else {
        // Column exists, but check if foreign key exists
        const existingForeignKeys = usersTable.foreignKeys.filter(
          (fk) =>
            fk.columnNames.includes('role_id') &&
            fk.referencedTableName === 'roles',
        );
        if (existingForeignKeys.length === 0) {
          // Column exists but foreign key doesn't, try to create it
          try {
            await queryRunner.createForeignKey(
              'users',
              new TableForeignKey({
                columnNames: ['role_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'roles',
                onDelete: 'SET NULL',
              }),
            );
          } catch (error) {
            // Ignore if foreign key already exists or can't be created
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (
              !errorMessage.includes('Duplicate foreign key') &&
              !errorMessage.includes('already exists') &&
              !errorMessage.includes("Can't DROP FOREIGN KEY")
            ) {
              throw error;
            }
          }
        }
        console.log('role_id column already exists in users table');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop role_permissions table first (due to foreign keys)
    const rolePermissionsTableExists = await queryRunner.hasTable(
      'role_permissions',
    );

    if (rolePermissionsTableExists) {
      // Drop foreign keys first
      const table = await queryRunner.getTable('role_permissions');
      if (table) {
        const foreignKeys = table.foreignKeys;
        for (const foreignKey of foreignKeys) {
          await queryRunner.dropForeignKey('role_permissions', foreignKey);
        }
      }

      // Drop indexes
      await queryRunner.dropIndex(
        'role_permissions',
        'IDX_role_permissions_composite',
      );

      // Drop table
      await queryRunner.dropTable('role_permissions');
      console.log('Role_permissions table dropped');
    }

    // Drop foreign key from users table that references roles before dropping roles table
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      // Find and drop foreign key that references roles table
      const foreignKeys = usersTable.foreignKeys.filter(
        (fk) => fk.referencedTableName === 'roles',
      );
      for (const foreignKey of foreignKeys) {
        try {
          await queryRunner.dropForeignKey('users', foreignKey);
        } catch (error) {
          // Ignore if foreign key doesn't exist or already dropped
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            !errorMessage.includes("Can't DROP FOREIGN KEY") &&
            !errorMessage.includes('check that it exists')
          ) {
            throw error;
          }
        }
      }
    }

    // Drop roles table
    const rolesTableExists = await queryRunner.hasTable('roles');
    if (rolesTableExists) {
      // Drop indexes first
      await queryRunner.dropIndex('roles', 'IDX_roles_slug');
      await queryRunner.dropIndex('roles', 'IDX_roles_name');

      // Drop table
      await queryRunner.dropTable('roles');
      console.log('Roles table dropped');
    }

    // Drop permissions table
    const permissionsTableExists = await queryRunner.hasTable('permissions');
    if (permissionsTableExists) {
      // Drop indexes first
      await queryRunner.dropIndex('permissions', 'IDX_permissions_slug');
      await queryRunner.dropIndex('permissions', 'IDX_permissions_name');

      // Drop table
      await queryRunner.dropTable('permissions');
      console.log('Permissions table dropped');
    }
  }
}
