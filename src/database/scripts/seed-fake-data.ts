import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as mysql from 'mysql2/promise';

// Load environment variables
config();

/**
 * Get main database connection configuration
 */
function getMainDatabaseConfig(): mysql.ConnectionOptions {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'horizon',
  };
}

/**
 * Sanitize database name to prevent SQL injection
 */
function sanitizeDatabaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

/**
 * Seed fake data for a specific clinic
 * Usage: ts-node src/database/scripts/seed-fake-data.ts "Clinic Name"
 */
async function seedFakeDataForClinic(clinicName: string) {
  if (!clinicName) {
    console.error('Error: Clinic name is required');
    console.log('Usage: ts-node src/database/scripts/seed-fake-data.ts "Clinic Name"');
    process.exit(1);
  }

  console.log(`\n=== Seeding Fake Data for Clinic: ${clinicName} ===\n`);

  // Connect to main database
  const mainConnection = await mysql.createConnection(getMainDatabaseConfig());

  try {
    // Find clinic by name
    const [clinicRows] = await mainConnection.query(
      `SELECT id, name, database_name FROM clinics WHERE name = ? LIMIT 1`,
      [clinicName],
    );
    const clinics = clinicRows as any[];

    if (!clinics || clinics.length === 0) {
      console.error(`Error: Clinic "${clinicName}" not found`);
      console.log('Available clinics:');
      const [allClinics] = await mainConnection.query(
        `SELECT id, name FROM clinics ORDER BY name`,
      );
      (allClinics as any[]).forEach((c: any) => {
        console.log(`  - ${c.name} (ID: ${c.id})`);
      });
      await mainConnection.end();
      process.exit(1);
    }

    const clinic = clinics[0];
    console.log(`Found clinic: ${clinic.name} (ID: ${clinic.id})`);

    if (!clinic.database_name) {
      console.error(`Error: Clinic "${clinicName}" does not have a database_name`);
      await mainConnection.end();
      process.exit(1);
    }

    const sanitizedDbName = sanitizeDatabaseName(clinic.database_name);
    console.log(`Clinic database: ${sanitizedDbName}\n`);

    // Seed main system data for this clinic
    await seedMainSystemData(mainConnection, clinic.id);

    // Seed clinic database data
    await seedClinicDatabase(sanitizedDbName, clinic.id);

    console.log(`\n✓ Successfully seeded fake data for clinic: ${clinicName}`);
    await mainConnection.end();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error seeding fake data:', error);
    await mainConnection.end();
    process.exit(1);
  }
}

/**
 * Seed main system data for a specific clinic
 */
async function seedMainSystemData(
  connection: mysql.Connection,
  clinicId: number,
): Promise<void> {
  console.log('=== Seeding Main System Data ===');

  // 1. Seed Branches for this clinic
  console.log('Seeding branches...');
  const branches = [
    {
      name: `Branch 1 - Clinic ${clinicId}`,
      clinic_id: clinicId,
      clinic_branch_id: 1,
      country_id: 1,
      city_id: 1,
      lat: 30.0444,
      longit: 31.2357,
      address: `Main Branch Address for Clinic ${clinicId}`,
    },
    {
      name: `Branch 2 - Clinic ${clinicId}`,
      clinic_id: clinicId,
      clinic_branch_id: 2,
      country_id: 1,
      city_id: 1,
      lat: 30.0444,
      longit: 31.2357,
      address: `Secondary Branch Address for Clinic ${clinicId}`,
    },
  ];

  const branchIds: number[] = [];
  for (const branch of branches) {
    const [existingRows] = await connection.query(
      `SELECT id FROM branches WHERE clinic_id = ? AND name = ? LIMIT 1`,
      [branch.clinic_id, branch.name],
    );
    const existing = (existingRows as any[])[0];

    if (!existing) {
      const [result]: any = await connection.query(
        `INSERT INTO branches (
          name, clinic_id, clinic_branch_id, country_id, city_id, 
          lat, longit, address, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          branch.name,
          branch.clinic_id,
          branch.clinic_branch_id,
          branch.country_id,
          branch.city_id,
          branch.lat,
          branch.longit,
          branch.address,
        ],
      );
      branchIds.push(result.insertId);
      console.log(`  ✓ Created branch: ${branch.name}`);
    } else {
      branchIds.push(existing.id);
      console.log(`  - Branch already exists: ${branch.name}`);
    }
  }

  // 2. Seed Doctors for this clinic
  console.log('\nSeeding doctors...');
  const doctors = [
    {
      name: `Dr. Ahmed ${clinicId}`,
      clinic_id: clinicId,
      clinic_doctor_id: 1,
      branch_id: branchIds[0] || null,
      age: 35,
      email: `doctor1@clinic${clinicId}.com`,
      phone: `010${1000 + clinicId}0001`,
      specialty: 'Cardiology',
      department: 'CARDIOLOGY',
      degree: 'MD',
      languages: 'English, Arabic',
      bio: `Experienced cardiologist with ${10 + clinicId} years of practice`,
      appoint_type: 'in-clinic',
      is_active: true,
      experience_years: 10,
      number_of_patients: 500,
    },
    {
      name: `Dr. Sarah ${clinicId}`,
      clinic_id: clinicId,
      clinic_doctor_id: 2,
      branch_id: branchIds[0] || null,
      age: 32,
      email: `doctor2@clinic${clinicId}.com`,
      phone: `010${1000 + clinicId}0002`,
      specialty: 'Pediatrics',
      department: 'PEDIATRICS',
      degree: 'MD',
      languages: 'English, Arabic, French',
      bio: `Pediatric specialist with ${8 + clinicId} years of experience`,
      appoint_type: 'online',
      is_active: true,
      experience_years: 8,
      number_of_patients: 300,
    },
  ];

  for (const doctor of doctors) {
    const [existingRows] = await connection.query(
      `SELECT id FROM doctors WHERE clinic_id = ? AND clinic_doctor_id = ? LIMIT 1`,
      [doctor.clinic_id, doctor.clinic_doctor_id],
    );
    const existing = (existingRows as any[])[0];

    if (!existing) {
      await connection.query(
        `INSERT INTO doctors (
          name, clinic_id, clinic_doctor_id, branch_id, age, email, phone,
          specialty, department, degree, languages, bio, appoint_type,
          is_active, experience_years, number_of_patients, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          doctor.name,
          doctor.clinic_id,
          doctor.clinic_doctor_id,
          doctor.branch_id,
          doctor.age,
          doctor.email,
          doctor.phone,
          doctor.specialty,
          doctor.department,
          doctor.degree,
          doctor.languages,
          doctor.bio,
          doctor.appoint_type,
          doctor.is_active,
          doctor.experience_years,
          doctor.number_of_patients,
        ],
      );
      console.log(`  ✓ Created doctor: ${doctor.name}`);
    } else {
      console.log(`  - Doctor already exists: ${doctor.name}`);
    }
  }

  // 3. Seed Services for this clinic
  console.log('\nSeeding services...');
  const services = [
    {
      clinic_id: clinicId,
      name: 'General Consultation',
      category: 'Consultation',
      specialty: 'General Medicine',
      type: 'consultation',
      default_duration_minutes: 30,
      default_price: 200,
      currency: 'EGP',
      is_active: true,
    },
    {
      clinic_id: clinicId,
      name: 'Cardiology Consultation',
      category: 'Specialty',
      specialty: 'Cardiology',
      type: 'consultation',
      default_duration_minutes: 45,
      default_price: 500,
      currency: 'EGP',
      is_active: true,
    },
    {
      clinic_id: clinicId,
      name: 'Pediatric Consultation',
      category: 'Specialty',
      specialty: 'Pediatrics',
      type: 'consultation',
      default_duration_minutes: 30,
      default_price: 300,
      currency: 'EGP',
      is_active: true,
    },
  ];

  for (const service of services) {
    const [existingRows] = await connection.query(
      `SELECT id FROM services WHERE clinic_id = ? AND name = ? LIMIT 1`,
      [service.clinic_id, service.name],
    );
    const existing = (existingRows as any[])[0];

    if (!existing) {
      await connection.query(
        `INSERT INTO services (
          clinic_id, name, category, specialty, type, 
          default_duration_minutes, default_price, currency, is_active, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          service.clinic_id,
          service.name,
          service.category,
          service.specialty,
          service.type,
          service.default_duration_minutes,
          service.default_price,
          service.currency,
          service.is_active,
        ],
      );
      console.log(`  ✓ Created service: ${service.name}`);
    } else {
      console.log(`  - Service already exists: ${service.name}`);
    }
  }
}

/**
 * Seed clinic database data
 */
async function seedClinicDatabase(
  sanitizedDbName: string,
  clinicId: number,
): Promise<void> {
  console.log(`\n=== Seeding Clinic Database: ${sanitizedDbName} ===`);

  // Create connection to clinic database
  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: sanitizedDbName,
    });
  } catch (error) {
    console.error(
      `Failed to connect to clinic database. Make sure the database exists: ${sanitizedDbName}`,
    );
    throw error;
  }

  try {
    // 1. Seed Clinic Users (Doctors and Staff)
    console.log(`[${sanitizedDbName}] Seeding clinic users...`);
    const [clinicAdminRoleRows] = await connection.query(
      `SELECT id FROM roles WHERE slug = 'clinic-admin' LIMIT 1`,
    );
    const [doctorRoleRows] = await connection.query(
      `SELECT id FROM roles WHERE slug = 'doctor' LIMIT 1`,
    );
    const clinicAdminRole = (clinicAdminRoleRows as any[])[0];
    const doctorRole = (doctorRoleRows as any[])[0];

    const users = [
      {
        name: `Clinic Admin ${clinicId}`,
        phone: `010${3000 + clinicId}0000`,
        email: `admin@${sanitizedDbName}.com`,
        password: await bcrypt.hash('123456789', 10),
        package_id: 0,
        role_id: clinicAdminRole?.id || null,
      },
      {
        name: `Dr. Clinic Doctor ${clinicId}`,
        phone: `010${2000 + clinicId}0000`,
        email: `doctor1@${sanitizedDbName}.com`,
        password: await bcrypt.hash('123456789', 10),
        package_id: 0,
        role_id: doctorRole?.id || null,
      },
    ];

    const clinicUserIds: number[] = [];
    for (const user of users) {
      const [existingRows] = await connection.query(
        `SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1`,
        [user.phone, user.email],
      );
      const existing = (existingRows as any[])[0];

      if (!existing) {
        const [result]: any = await connection.query(
          `INSERT INTO users (name, phone, email, password, package_id, role_id, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            user.name,
            user.phone,
            user.email,
            user.password,
            user.package_id,
            user.role_id,
          ],
        );
        clinicUserIds.push(result.insertId);
        console.log(`[${sanitizedDbName}]   ✓ Created user: ${user.name}`);
      } else {
        clinicUserIds.push(existing.id);
        console.log(`[${sanitizedDbName}]   - User already exists: ${user.name}`);
      }
    }

    // 2. Seed Clinic Branches
    console.log(`[${sanitizedDbName}] Seeding clinic branches...`);
    const branches = [
      {
        name: `Main Branch ${clinicId}`,
        clinic_id: clinicId,
        lat: 30.0444,
        longit: 31.2357,
        address: `Main Branch Address ${clinicId}`,
      },
    ];

    const clinicBranchIds: number[] = [];
    for (const branch of branches) {
      const [existingRows] = await connection.query(
        `SELECT id FROM branches WHERE clinic_id = ? AND name = ? LIMIT 1`,
        [branch.clinic_id, branch.name],
      );
      const existing = (existingRows as any[])[0];

      if (!existing) {
        const [result]: any = await connection.query(
          `INSERT INTO branches (name, clinic_id, lat, longit, address, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            branch.name,
            branch.clinic_id,
            branch.lat,
            branch.longit,
            branch.address,
          ],
        );
        clinicBranchIds.push(result.insertId);
        console.log(`[${sanitizedDbName}]   ✓ Created branch: ${branch.name}`);
      } else {
        clinicBranchIds.push(existing.id);
        console.log(`[${sanitizedDbName}]   - Branch already exists: ${branch.name}`);
      }
    }

    // 3. Seed Clinic Doctors
    console.log(`[${sanitizedDbName}] Seeding clinic doctors...`);
    if (clinicUserIds.length > 1 && clinicBranchIds.length > 0) {
      const doctors = [
        {
          name: `Dr. Clinic Doctor ${clinicId}`,
          user_id: clinicUserIds[1],
          clinic_id: clinicId,
          branch_id: clinicBranchIds[0],
          age: 35,
          email: `doctor@${sanitizedDbName}.com`,
          phone: `010${2000 + clinicId}0000`,
          specialty: 'General Medicine',
          degree: 'MD',
          languages: 'English, Arabic',
          bio: `Clinic doctor with experience`,
          appoint_type: 'in-clinic',
          is_active: true,
        },
      ];

      for (const doctor of doctors) {
        const [existingRows] = await connection.query(
          `SELECT id FROM doctors WHERE user_id = ? AND clinic_id = ? LIMIT 1`,
          [doctor.user_id, doctor.clinic_id],
        );
        const existing = (existingRows as any[])[0];

        if (!existing) {
          await connection.query(
            `INSERT INTO doctors (
              name, user_id, clinic_id, branch_id, age, email, phone,
              specialty, degree, languages, bio, appoint_type, is_active, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              doctor.name,
              doctor.user_id,
              doctor.clinic_id,
              doctor.branch_id,
              doctor.age,
              doctor.email,
              doctor.phone,
              doctor.specialty,
              doctor.degree,
              doctor.languages,
              doctor.bio,
              doctor.appoint_type,
              doctor.is_active,
            ],
          );
          console.log(`[${sanitizedDbName}]   ✓ Created doctor: ${doctor.name}`);
        } else {
          console.log(`[${sanitizedDbName}]   - Doctor already exists: ${doctor.name}`);
        }
      }
    }

    // 4. Seed Clinic Services
    console.log(`[${sanitizedDbName}] Seeding clinic services...`);
    const services = [
      {
        name: 'General Consultation',
        category: 'Consultation',
        specialty: 'General Medicine',
        type: 'consultation',
        default_duration_minutes: 30,
        default_price: 200,
        currency: 'EGP',
        is_active: true,
      },
      {
        name: 'Follow-up Consultation',
        category: 'Consultation',
        specialty: 'General Medicine',
        type: 'follow_up',
        default_duration_minutes: 15,
        default_price: 100,
        currency: 'EGP',
        is_active: true,
      },
    ];

    for (const service of services) {
      const [existingRows] = await connection.query(
        `SELECT id FROM services WHERE name = ? LIMIT 1`,
        [service.name],
      );
      const existing = (existingRows as any[])[0];

      if (!existing) {
        await connection.query(
          `INSERT INTO services (
            name, category, specialty, type, default_duration_minutes,
            default_price, currency, is_active, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            service.name,
            service.category,
            service.specialty,
            service.type,
            service.default_duration_minutes,
            service.default_price,
            service.currency,
            service.is_active,
          ],
        );
        console.log(`[${sanitizedDbName}]   ✓ Created service: ${service.name}`);
      } else {
        console.log(`[${sanitizedDbName}]   - Service already exists: ${service.name}`);
      }
    }

    // 5. Seed Slot Templates (if doctors exist)
    console.log(`[${sanitizedDbName}] Seeding slot templates...`);
    const [doctorRows] = await connection.query(`SELECT id FROM doctors LIMIT 1`);
    const doctors = doctorRows as any[];
    if (doctors && doctors.length > 0) {
      const doctorId = doctors[0].id;
      const slotTemplates = [
        {
          doctor_id: doctorId,
          days: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
          duration: '00:30:00',
          cost: 200.0,
        },
        {
          doctor_id: doctorId,
          days: 'SATURDAY,SUNDAY',
          duration: '00:45:00',
          cost: 250.0,
        },
      ];

      for (const slot of slotTemplates) {
        const [existingRows] = await connection.query(
          `SELECT id FROM slot_template WHERE doctor_id = ? AND days = ? LIMIT 1`,
          [slot.doctor_id, slot.days],
        );
        const existing = (existingRows as any[])[0];

        if (!existing) {
          await connection.query(
            `INSERT INTO slot_template (
              doctor_id, days, duration, cost, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [slot.doctor_id, slot.days, slot.duration, slot.cost],
          );
          console.log(
            `[${sanitizedDbName}]   ✓ Created slot template: ${slot.days}`,
          );
        } else {
          console.log(
            `[${sanitizedDbName}]   - Slot template already exists: ${slot.days}`,
          );
        }
      }
    }

    await connection.end();
  } catch (error) {
    console.error(`[${sanitizedDbName}] Error seeding clinic database:`, error);
    await connection.end();
    throw error;
  }
}

// Get clinic name from command line arguments
const clinicName = process.argv[2];

// Run the seed function
seedFakeDataForClinic(clinicName);

