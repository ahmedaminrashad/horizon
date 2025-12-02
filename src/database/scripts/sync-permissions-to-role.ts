import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function syncPermissionsToRole(roleId: number) {
  // Create DataSource
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'horizon',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established.');

    // Verify role exists
    const roleResult = await dataSource.query(
      `SELECT id, name, slug FROM roles WHERE id = ? LIMIT 1`,
      [roleId],
    );

    if (roleResult.length === 0) {
      console.error(`Role with ID ${roleId} not found.`);
      await dataSource.destroy();
      process.exit(1);
    }

    const role = roleResult[0];
    console.log(`\n=== Syncing Permissions to Role: ${role.name} (ID: ${roleId}, Slug: ${role.slug}) ===`);

    // Get all permissions from the database
    const allPermissions = await dataSource.query(
      `SELECT id, name, slug FROM permissions`,
    );

    if (allPermissions.length === 0) {
      console.log('No permissions found in the database.');
      await dataSource.destroy();
      process.exit(0);
    }

    console.log(`Found ${allPermissions.length} permission(s) in the database.`);

    // Get permissions already assigned to this role
    const assignedPermissions = await dataSource.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
      [roleId],
    );

    const assignedPermissionIds = assignedPermissions.map(
      (p: { permission_id: number }) => p.permission_id,
    );

    console.log(
      `${assignedPermissionIds.length} permission(s) already assigned to role_id ${roleId}.`,
    );

    // Sync permissions: assign missing ones, skip existing ones
    let assignedCount = 0;
    let skippedCount = 0;

    for (const permission of allPermissions) {
      // Check if the relationship already exists
      if (assignedPermissionIds.includes(permission.id)) {
        skippedCount++;
        continue;
      }

      // Double-check that the relationship doesn't exist (safety check)
      const existingRelation = await dataSource.query(
        `SELECT * FROM role_permissions 
         WHERE role_id = ? AND permission_id = ? 
         LIMIT 1`,
        [roleId, permission.id],
      );

      if (existingRelation.length === 0) {
        await dataSource.query(
          `INSERT INTO role_permissions (role_id, permission_id) 
           VALUES (?, ?)`,
          [roleId, permission.id],
        );
        console.log(
          `  ✓ Assigned: ${permission.name} (${permission.slug})`,
        );
        assignedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n=== Sync Summary ===');
    if (assignedCount > 0) {
      console.log(
        `✓ Successfully assigned ${assignedCount} permission(s) to role_id ${roleId}.`,
      );
    }

    if (skippedCount > 0) {
      console.log(
        `- Skipped ${skippedCount} permission(s) (already assigned).`,
      );
    }

    if (assignedCount === 0 && skippedCount === allPermissions.length) {
      console.log(
        `✓ All ${allPermissions.length} permission(s) are already assigned to role_id ${roleId}.`,
      );
    }

    console.log('\nSync completed successfully!');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error during sync:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Get role_id from command line argument or default to 2
const roleId = process.argv[2] ? parseInt(process.argv[2], 10) : 2;

if (isNaN(roleId)) {
  console.error('Invalid role_id. Please provide a valid number.');
  process.exit(1);
}

syncPermissionsToRole(roleId);
