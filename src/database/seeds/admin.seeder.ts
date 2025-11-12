import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  // Get admin role
  const adminRole = await roleRepository.findOne({
    where: { slug: 'admin' },
  });

  if (!adminRole) {
    console.log(
      'Admin role not found. Please run roles and permissions seeder first.',
    );
    return;
  }

  // Check if admin already exists
  const existingAdminByPhone = await userRepository.findOne({
    where: { phone: '01017213866' },
  });

  const existingAdminByEmail = await userRepository.findOne({
    where: { email: 'amin@horizon.com' },
  });

  const existingAdmin = existingAdminByPhone || existingAdminByEmail;

  if (existingAdmin) {
    // Update existing admin to have admin role if not already assigned
    if (existingAdmin.role_id !== adminRole.id) {
      existingAdmin.role_id = adminRole.id;
      existingAdmin.role = adminRole;
      await userRepository.save(existingAdmin);
      console.log('Admin user role updated successfully!');
    } else {
      console.log('Admin user already exists with admin role. Skipping seed.');
    }
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('123456789', 10);

  // Create admin user
  const admin = userRepository.create({
    phone: '01017213866',
    email: 'amin@horizon.com',
    password: hashedPassword,
    package_id: 0, // Admin package ID
    role_id: adminRole.id,
    role: adminRole,
  });

  await userRepository.save(admin);
  console.log('Admin user created successfully!');
  console.log('Email: amin@horizon.com');
  console.log('Phone: 01017213866');
  console.log('Password: 123456789');
  console.log(`Role: ${adminRole.name} (${adminRole.slug})`);
}
