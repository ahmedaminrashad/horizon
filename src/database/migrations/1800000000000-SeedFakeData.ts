import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as mysql from 'mysql2/promise';

export class SeedFakeData1800000000000 implements MigrationInterface {
  /**
   * Get main database connection configuration
   */
  private getMainDatabaseConfig(): mysql.ConnectionOptions {
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
  private sanitizeDatabaseName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Seed fake data for main system
   */
  private async seedMainSystem(queryRunner: QueryRunner): Promise<void> {
    console.log('\n=== Seeding Main System Fake Data ===');

    // 1. Seed Countries
    console.log('Seeding countries...');
    const countries = [
      { name_en: 'Egypt', name_ar: 'مصر' },
      { name_en: 'Saudi Arabia', name_ar: 'السعودية' },
      { name_en: 'United Arab Emirates', name_ar: 'الإمارات' },
      { name_en: 'Jordan', name_ar: 'الأردن' },
      { name_en: 'Lebanon', name_ar: 'لبنان' },
    ];

    const countryIds: number[] = [];
    for (const country of countries) {
      const existingResult: any = await queryRunner.query(
        `SELECT id FROM countries WHERE name_en = ? LIMIT 1`,
        [country.name_en],
      );
      const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

      if (!existing) {
        const result: any = await queryRunner.query(
          `INSERT INTO countries (name_en, name_ar, createdAt, updatedAt) 
           VALUES (?, ?, NOW(), NOW())`,
          [country.name_en, country.name_ar],
        );
        // TypeORM returns ResultSetHeader for INSERT, which has insertId
        const insertId = result?.insertId || (Array.isArray(result) && result[0]?.insertId);
        if (insertId) {
          countryIds.push(insertId);
          console.log(`  ✓ Created country: ${country.name_en}`);
        } else {
          // Fallback: query for the ID
          const newCountryResult: any = await queryRunner.query(
            `SELECT id FROM countries WHERE name_en = ? LIMIT 1`,
            [country.name_en],
          );
          const newCountry = Array.isArray(newCountryResult) ? newCountryResult[0] : newCountryResult;
          countryIds.push(newCountry?.id || 0);
          console.log(`  ✓ Created country: ${country.name_en}`);
        }
      } else {
        countryIds.push(existing.id);
        console.log(`  - Country already exists: ${country.name_en}`);
      }
    }

    // 2. Seed Cities
    console.log('\nSeeding cities...');
    const cities = [
      { name_en: 'Cairo', name_ar: 'القاهرة', country_id: countryIds[0] },
      { name_en: 'Alexandria', name_ar: 'الإسكندرية', country_id: countryIds[0] },
      { name_en: 'Riyadh', name_ar: 'الرياض', country_id: countryIds[1] },
      { name_en: 'Jeddah', name_ar: 'جدة', country_id: countryIds[1] },
      { name_en: 'Dubai', name_ar: 'دبي', country_id: countryIds[2] },
      { name_en: 'Amman', name_ar: 'عمان', country_id: countryIds[3] },
      { name_en: 'Beirut', name_ar: 'بيروت', country_id: countryIds[4] },
    ];

    const cityIds: number[] = [];
    for (const city of cities) {
      const existingResult: any = await queryRunner.query(
        `SELECT id FROM cities WHERE name_en = ? AND country_id = ? LIMIT 1`,
        [city.name_en, city.country_id],
      );
      const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

      if (!existing) {
        const result: any = await queryRunner.query(
          `INSERT INTO cities (name_en, name_ar, country_id, createdAt, updatedAt) 
           VALUES (?, ?, ?, NOW(), NOW())`,
          [city.name_en, city.name_ar, city.country_id],
        );
        const insertId = result?.insertId || (Array.isArray(result) && result[0]?.insertId);
        if (insertId) {
          cityIds.push(insertId);
          console.log(`  ✓ Created city: ${city.name_en}`);
        } else {
          const newCityResult: any = await queryRunner.query(
            `SELECT id FROM cities WHERE name_en = ? AND country_id = ? LIMIT 1`,
            [city.name_en, city.country_id],
          );
          const newCity = Array.isArray(newCityResult) ? newCityResult[0] : newCityResult;
          cityIds.push(newCity?.id || 0);
          console.log(`  ✓ Created city: ${city.name_en}`);
        }
      } else {
        cityIds.push(existing.id);
        console.log(`  - City already exists: ${city.name_en}`);
      }
    }

    // 3. Seed Packages
    console.log('\nSeeding packages...');
    const packages = [
      {
        price_monthly: 99.99,
        price_annual: 999.99,
        is_featured: true,
        features: JSON.stringify([
          'Unlimited appointments',
          'Multiple branches',
          'Advanced analytics',
          '24/7 support',
        ]),
      },
      {
        price_monthly: 199.99,
        price_annual: 1999.99,
        is_featured: true,
        features: JSON.stringify([
          'Everything in Basic',
          'Priority support',
          'Custom branding',
          'API access',
        ]),
      },
      {
        price_monthly: 49.99,
        price_annual: 499.99,
        is_featured: false,
        features: JSON.stringify([
          'Basic appointments',
          'Single branch',
          'Email support',
        ]),
      },
    ];

    const packageIds: number[] = [];
    for (const pkg of packages) {
      const result: any = await queryRunner.query(
        `INSERT INTO packages (price_monthly, price_annual, is_featured, features, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [pkg.price_monthly, pkg.price_annual, pkg.is_featured, pkg.features],
      );
      const insertId = result?.insertId || (Array.isArray(result) && result[0]?.insertId);
      if (insertId) {
        packageIds.push(insertId);
        console.log(`  ✓ Created package: $${pkg.price_monthly}/month`);
      } else {
        // Fallback: get the last inserted ID
        const lastPackageResult: any = await queryRunner.query(
          `SELECT id FROM packages ORDER BY id DESC LIMIT 1`,
        );
        const lastPackage = Array.isArray(lastPackageResult) ? lastPackageResult[0] : lastPackageResult;
        packageIds.push(lastPackage?.id || 0);
        console.log(`  ✓ Created package: $${pkg.price_monthly}/month`);
      }
    }

    // 4. Seed Clinics
    console.log('\nSeeding clinics...');
    const clinics = [
      {
        name: 'Al-Salam Medical Center',
        email: 'info@alsalam-clinic.com',
        phone: '01012345678',
        country_id: countryIds[0],
        city_id: cityIds[0],
        package_id: packageIds[0],
        lat: 30.0444,
        longit: 31.2357,
        address: '123 Tahrir Square, Cairo',
        wa_number: '01012345678',
        bio: 'A leading medical center providing comprehensive healthcare services.',
        departments: JSON.stringify(['CARDIOLOGY', 'NEUROLOGY', 'PEDIATRICS']),
        is_active: true,
        database_name: 'clinic_alsalam',
      },
      {
        name: 'Royal Health Clinic',
        email: 'contact@royal-health.com',
        phone: '01023456789',
        country_id: countryIds[1],
        city_id: cityIds[2],
        package_id: packageIds[1],
        lat: 24.7136,
        longit: 46.6753,
        address: '456 King Fahd Road, Riyadh',
        wa_number: '01023456789',
        bio: 'Premium healthcare services with state-of-the-art facilities.',
        departments: JSON.stringify(['ORTHOPEDICS', 'SURGERY', 'DERMATOLOGY']),
        is_active: true,
        database_name: 'clinic_royal',
      },
      {
        name: 'City Medical Group',
        email: 'hello@citymedical.com',
        phone: '01034567890',
        country_id: countryIds[2],
        city_id: cityIds[4],
        package_id: packageIds[0],
        lat: 25.2048,
        longit: 55.2708,
        address: '789 Sheikh Zayed Road, Dubai',
        wa_number: '01034567890',
        bio: 'Modern medical facility offering specialized treatments.',
        departments: JSON.stringify(['INTERNAL_MEDICINE', 'RADIOLOGY', 'EMERGENCY']),
        is_active: true,
        database_name: 'clinic_city',
      },
    ];

    const clinicIds: number[] = [];
    for (const clinic of clinics) {
      const existingResult: any = await queryRunner.query(
        `SELECT id FROM clinics WHERE email = ? OR phone = ? LIMIT 1`,
        [clinic.email, clinic.phone],
      );
      const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

      if (!existing) {
        const result: any = await queryRunner.query(
          `INSERT INTO clinics (
            name, email, phone, country_id, city_id, package_id, 
            lat, longit, address, wa_number, bio, departments, 
            is_active, database_name, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            clinic.name,
            clinic.email,
            clinic.phone,
            clinic.country_id,
            clinic.city_id,
            clinic.package_id,
            clinic.lat,
            clinic.longit,
            clinic.address,
            clinic.wa_number,
            clinic.bio,
            clinic.departments,
            clinic.is_active,
            clinic.database_name,
          ],
        );
        const insertId = result?.insertId || (Array.isArray(result) && result[0]?.insertId);
        if (insertId) {
          clinicIds.push(insertId);
          console.log(`  ✓ Created clinic: ${clinic.name}`);
        } else {
          const newClinicResult: any = await queryRunner.query(
            `SELECT id FROM clinics WHERE email = ? OR phone = ? LIMIT 1`,
            [clinic.email, clinic.phone],
          );
          const newClinic = Array.isArray(newClinicResult) ? newClinicResult[0] : newClinicResult;
          clinicIds.push(newClinic?.id || 0);
          console.log(`  ✓ Created clinic: ${clinic.name}`);
        }
      } else {
        clinicIds.push(existing.id);
        console.log(`  - Clinic already exists: ${clinic.name}`);
      }
    }

    // 5. Seed Branches
    console.log('\nSeeding branches...');
    const branches = [
      {
        name: 'Main Branch - Al-Salam',
        clinic_id: clinicIds[0],
        clinic_branch_id: 1,
        country_id: countryIds[0],
        city_id: cityIds[0],
        lat: 30.0444,
        longit: 31.2357,
        address: '123 Tahrir Square, Cairo',
      },
      {
        name: 'Branch 2 - Al-Salam',
        clinic_id: clinicIds[0],
        clinic_branch_id: 2,
        country_id: countryIds[0],
        city_id: cityIds[1],
        lat: 31.2001,
        longit: 29.9187,
        address: '456 Corniche Road, Alexandria',
      },
      {
        name: 'Main Branch - Royal',
        clinic_id: clinicIds[1],
        clinic_branch_id: 1,
        country_id: countryIds[1],
        city_id: cityIds[2],
        lat: 24.7136,
        longit: 46.6753,
        address: '456 King Fahd Road, Riyadh',
      },
      {
        name: 'Main Branch - City Medical',
        clinic_id: clinicIds[2],
        clinic_branch_id: 1,
        country_id: countryIds[2],
        city_id: cityIds[4],
        lat: 25.2048,
        longit: 55.2708,
        address: '789 Sheikh Zayed Road, Dubai',
      },
    ];

    const branchIds: number[] = [];
    for (const branch of branches) {
      const existingResult: any = await queryRunner.query(
        `SELECT id FROM branches WHERE clinic_id = ? AND name = ? LIMIT 1`,
        [branch.clinic_id, branch.name],
      );
      const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

      if (!existing) {
        const result: any = await queryRunner.query(
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
        const insertId = result?.insertId || (Array.isArray(result) && result[0]?.insertId);
        if (insertId) {
          branchIds.push(insertId);
          console.log(`  ✓ Created branch: ${branch.name}`);
        } else {
          const newBranchResult: any = await queryRunner.query(
            `SELECT id FROM branches WHERE clinic_id = ? AND name = ? LIMIT 1`,
            [branch.clinic_id, branch.name],
          );
          const newBranch = Array.isArray(newBranchResult) ? newBranchResult[0] : newBranchResult;
          branchIds.push(newBranch?.id || 0);
          console.log(`  ✓ Created branch: ${branch.name}`);
        }
      } else {
        branchIds.push(existing.id);
        console.log(`  - Branch already exists: ${branch.name}`);
      }
    }

    // 6. Seed Main System Doctors
    console.log('\nSeeding main system doctors...');
    const mainDoctors = [
      {
        name: 'Dr. Ahmed Mohamed',
        age: 45,
        clinic_id: clinicIds[0],
        clinic_doctor_id: 1,
        branch_id: branchIds[0],
        experience_years: 20,
        number_of_patients: 5000,
        cost: 500.0,
        email: 'ahmed.mohamed@alsalam-clinic.com',
        phone: '01011111111',
        department: 'CARDIOLOGY',
        specialty: 'Cardiac Surgery',
        license_number: 'MD-12345',
        degree: 'MD, PhD',
        languages: 'Arabic, English',
        bio: 'Experienced cardiologist with 20 years of practice.',
        appoint_type: 'in-clinic',
        is_active: true,
      },
      {
        name: 'Dr. Sarah Ali',
        age: 38,
        clinic_id: clinicIds[1],
        clinic_doctor_id: 1,
        branch_id: branchIds[2],
        experience_years: 15,
        number_of_patients: 3000,
        cost: 600.0,
        email: 'sarah.ali@royal-health.com',
        phone: '01022222222',
        department: 'DERMATOLOGY',
        specialty: 'Cosmetic Dermatology',
        license_number: 'MD-23456',
        degree: 'MD',
        languages: 'Arabic, English, French',
        bio: 'Specialized in cosmetic and medical dermatology.',
        appoint_type: 'in-clinic',
        is_active: true,
      },
      {
        name: 'Dr. Omar Hassan',
        age: 42,
        clinic_id: clinicIds[2],
        clinic_doctor_id: 1,
        branch_id: branchIds[3],
        experience_years: 18,
        number_of_patients: 4000,
        cost: 550.0,
        email: 'omar.hassan@citymedical.com',
        phone: '01033333333',
        department: 'ORTHOPEDICS',
        specialty: 'Orthopedic Surgery',
        license_number: 'MD-34567',
        degree: 'MD, MS',
        languages: 'Arabic, English',
        bio: 'Expert in orthopedic surgery and sports medicine.',
        appoint_type: 'in-clinic',
        is_active: true,
      },
    ];

    for (const doctor of mainDoctors) {
      const existingResult: any = await queryRunner.query(
        `SELECT id FROM doctors WHERE clinic_id = ? AND clinic_doctor_id = ? LIMIT 1`,
        [doctor.clinic_id, doctor.clinic_doctor_id],
      );
      const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

      if (!existing) {
        await queryRunner.query(
          `INSERT INTO doctors (
            name, age, clinic_id, clinic_doctor_id, branch_id, 
            experience_years, number_of_patients, cost, email, phone, 
            department, specialty, license_number, degree, languages, 
            bio, appoint_type, is_active, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            doctor.name,
            doctor.age,
            doctor.clinic_id,
            doctor.clinic_doctor_id,
            doctor.branch_id,
            doctor.experience_years,
            doctor.number_of_patients,
            doctor.cost,
            doctor.email,
            doctor.phone,
            doctor.department,
            doctor.specialty,
            doctor.license_number,
            doctor.degree,
            doctor.languages,
            doctor.bio,
            doctor.appoint_type,
            doctor.is_active,
          ],
        );
        console.log(`  ✓ Created doctor: ${doctor.name}`);
      } else {
        console.log(`  - Doctor already exists: ${doctor.name}`);
      }
    }

    // 7. Seed Main System Services
    console.log('\nSeeding main system services...');
    const mainServices = [
      {
        clinic_id: clinicIds[0],
        name: 'General Consultation',
        category: 'Consultation',
        specialty: 'General Medicine',
        type: 'consultation',
        default_duration_minutes: 30,
        default_price: 200.0,
        currency: 'EGP',
        is_active: true,
      },
      {
        clinic_id: clinicIds[0],
        name: 'Cardiac Checkup',
        category: 'Cardiology',
        specialty: 'Cardiology',
        type: 'consultation',
        default_duration_minutes: 60,
        default_price: 500.0,
        currency: 'EGP',
        is_active: true,
      },
      {
        clinic_id: clinicIds[1],
        name: 'Dermatology Consultation',
        category: 'Dermatology',
        specialty: 'Dermatology',
        type: 'consultation',
        default_duration_minutes: 45,
        default_price: 300.0,
        currency: 'SAR',
        is_active: true,
      },
      {
        clinic_id: clinicIds[2],
        name: 'Orthopedic Consultation',
        category: 'Orthopedics',
        specialty: 'Orthopedics',
        type: 'consultation',
        default_duration_minutes: 40,
        default_price: 400.0,
        currency: 'AED',
        is_active: true,
      },
    ];

      for (const service of mainServices) {
        const existingResult: any = await queryRunner.query(
          `SELECT id FROM services WHERE clinic_id = ? AND name = ? LIMIT 1`,
          [service.clinic_id, service.name],
        );
        const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

      if (!existing) {
        await queryRunner.query(
          `INSERT INTO services (
            clinic_id, name, category, specialty, type, 
            default_duration_minutes, default_price, currency, 
            is_active, createdAt, updatedAt
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

    // 8. Seed Regular Users
    console.log('\nSeeding regular users...');
    const patientRoleResult: any = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'patient' LIMIT 1`,
    );
    const patientRole = Array.isArray(patientRoleResult) ? patientRoleResult[0] : patientRoleResult;

    if (patientRole) {
      const users = [
        {
          name: 'Mohamed Ali',
          phone: '01099999999',
          email: 'mohamed.ali@example.com',
          password: await bcrypt.hash('123456789', 10),
          package_id: 0,
          role_id: patientRole.id,
        },
        {
          name: 'Fatima Hassan',
          phone: '01088888888',
          email: 'fatima.hassan@example.com',
          password: await bcrypt.hash('123456789', 10),
          package_id: 0,
          role_id: patientRole.id,
        },
        {
          name: 'Omar Ibrahim',
          phone: '01077777777',
          email: 'omar.ibrahim@example.com',
          password: await bcrypt.hash('123456789', 10),
          package_id: 0,
          role_id: patientRole.id,
        },
      ];

      for (const user of users) {
        const existingResult: any = await queryRunner.query(
          `SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1`,
          [user.phone, user.email],
        );
        const existing = Array.isArray(existingResult) ? existingResult[0] : existingResult;

        if (!existing) {
          await queryRunner.query(
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
          console.log(`  ✓ Created user: ${user.name}`);
        } else {
          console.log(`  - User already exists: ${user.name}`);
        }
      }
    } else {
      console.log('  - Patient role not found, skipping user seeding');
    }

    console.log('\n✓ Main system fake data seeded successfully!');
  }

  /**
   * Seed fake data for a clinic database
   */
  private async seedClinicDatabase(
    queryRunner: QueryRunner,
    clinicId: number,
    clinicName: string,
    databaseName: string,
  ): Promise<void> {
    const sanitizedDbName = this.sanitizeDatabaseName(databaseName);
    console.log(`\n[${sanitizedDbName}] Seeding clinic fake data...`);

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
        `[${sanitizedDbName}] Failed to connect to clinic database. Make sure the database exists.`,
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

      const clinicUsers = [
        {
          name: `Admin ${clinicName}`,
          phone: `010${1000 + clinicId}0000`,
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
      for (const user of clinicUsers) {
        const [existingRows] = await connection.query(
          `SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1`,
          [user.phone, user.email],
        );
        const existing = (existingRows as any[])[0];

        if (!existing) {
          const [result] = await connection.query(
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
          clinicUserIds.push((result as any).insertId);
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
          name: 'Main Branch',
          clinic_id: clinicId,
          lat: 30.0444 + clinicId * 0.01,
          longit: 31.2357 + clinicId * 0.01,
          address: `Main Street ${clinicId}, Building ${clinicId}`,
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
          const [result] = await connection.query(
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
          clinicBranchIds.push((result as any).insertId);
          console.log(`[${sanitizedDbName}]   ✓ Created branch: ${branch.name}`);
        } else {
          clinicBranchIds.push(existing.id);
          console.log(`[${sanitizedDbName}]   - Branch already exists: ${branch.name}`);
        }
      }

      // 3. Seed Clinic Doctors
      console.log(`[${sanitizedDbName}] Seeding clinic doctors...`);
      if (clinicUserIds.length >= 2 && clinicBranchIds.length > 0) {
        const doctors = [
          {
            age: 35 + clinicId,
            department: 'CARDIOLOGY',
            specialty: 'Cardiac Care',
            user_id: clinicUserIds[1],
            clinic_id: clinicId,
            branch_id: clinicBranchIds[0],
            experience_years: 10 + clinicId,
            number_of_patients: 1000 + clinicId * 100,
            rate: 4.5 + clinicId * 0.1,
            cost: 300.0 + clinicId * 50,
            license_number: `CL-${clinicId}-001`,
            degree: 'MD',
            languages: 'Arabic, English',
            bio: `Experienced doctor at ${clinicName}`,
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
                age, department, specialty, user_id, clinic_id, branch_id,
                experience_years, number_of_patients, rate, cost,
                license_number, degree, languages, bio, appoint_type, is_active,
                createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                doctor.age,
                doctor.department,
                doctor.specialty,
                doctor.user_id,
                doctor.clinic_id,
                doctor.branch_id,
                doctor.experience_years,
                doctor.number_of_patients,
                doctor.rate,
                doctor.cost,
                doctor.license_number,
                doctor.degree,
                doctor.languages,
                doctor.bio,
                doctor.appoint_type,
                doctor.is_active,
              ],
            );
            console.log(`[${sanitizedDbName}]   ✓ Created doctor`);
          } else {
            console.log(`[${sanitizedDbName}]   - Doctor already exists`);
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
          default_price: 200.0,
          currency: 'EGP',
          is_active: true,
        },
        {
          name: 'Follow-up Visit',
          category: 'Follow-up',
          specialty: 'General Medicine',
          type: 'follow_up',
          default_duration_minutes: 15,
          default_price: 100.0,
          currency: 'EGP',
          is_active: true,
        },
        {
          name: 'Online Consultation',
          category: 'Telemedicine',
          specialty: 'General Medicine',
          type: 'online_consultation',
          default_duration_minutes: 30,
          default_price: 150.0,
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
            duration: '00:30:00',
            cost: 200.0,
            days: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY',
            doctor_id: doctorId,
          },
          {
            duration: '00:30:00',
            cost: 200.0,
            days: 'SATURDAY,SUNDAY',
            doctor_id: doctorId,
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
              `INSERT INTO slot_template (duration, cost, days, doctor_id, createdAt, updatedAt) 
               VALUES (?, ?, ?, ?, NOW(), NOW())`,
              [slot.duration, slot.cost, slot.days, slot.doctor_id],
            );
            console.log(`[${sanitizedDbName}]   ✓ Created slot template`);
          } else {
            console.log(`[${sanitizedDbName}]   - Slot template already exists`);
          }
        }
      } else {
        console.log(`[${sanitizedDbName}]   - No doctors found, skipping slot templates`);
      }

      console.log(`[${sanitizedDbName}] ✓ Clinic fake data seeded successfully!`);
    } finally {
      await connection.end();
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed main system data
    await this.seedMainSystem(queryRunner);

    // Get all clinic databases and seed them
    const connection = await mysql.createConnection(this.getMainDatabaseConfig());
    try {
      const [clinicRows] = await connection.query(
        `SELECT id, name, database_name FROM clinics 
         WHERE database_name IS NOT NULL AND database_name != ''`,
      );
      const clinics = clinicRows as any[];

      if (clinics.length > 0) {
        console.log(
          `\n=== Seeding Fake Data for ${clinics.length} Clinic Database(s) ===`,
        );

        for (const clinic of clinics) {
          try {
            await this.seedClinicDatabase(
              queryRunner,
              clinic.id,
              clinic.name,
              clinic.database_name,
            );
          } catch (error) {
            console.error(
              `[${clinic.database_name}] Error seeding clinic database:`,
              error,
            );
            console.log(
              `[${clinic.database_name}] Skipping this clinic database...`,
            );
          }
        }

        console.log('\n✓ All clinic databases seeded successfully!');
      } else {
        console.log('\nNo clinic databases found to seed.');
      }
    } finally {
      await connection.end();
    }

    console.log('\n✓ Migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('\n=== Rolling back fake data ===');

    // Note: This is a destructive operation
    // In production, you might want to be more selective about what to delete

    // Delete main system data (in reverse order of creation)
    console.log('Deleting main system services...');
    await queryRunner.query(`DELETE FROM services WHERE name LIKE 'General Consultation%' 
      OR name LIKE 'Cardiac Checkup%' OR name LIKE 'Dermatology Consultation%' 
      OR name LIKE 'Orthopedic Consultation%'`);

    console.log('Deleting main system doctors...');
    await queryRunner.query(
      `DELETE FROM doctors WHERE name LIKE 'Dr. %' AND clinic_id IN (SELECT id FROM clinics WHERE database_name LIKE 'clinic_%')`,
    );

    console.log('Deleting branches...');
    await queryRunner.query(
      `DELETE FROM branches WHERE name LIKE '%Branch%' AND clinic_id IN (SELECT id FROM clinics WHERE database_name LIKE 'clinic_%')`,
    );

    console.log('Deleting regular users...');
    await queryRunner.query(
      `DELETE FROM users WHERE email LIKE '%@example.com' AND role_id IN (SELECT id FROM roles WHERE slug = 'patient')`,
    );

    console.log('Deleting clinics...');
    await queryRunner.query(
      `DELETE FROM clinics WHERE database_name LIKE 'clinic_%'`,
    );

    console.log('Deleting packages...');
    await queryRunner.query(
      `DELETE FROM packages WHERE price_monthly IN (99.99, 199.99, 49.99)`,
    );

    console.log('Deleting cities...');
    await queryRunner.query(
      `DELETE FROM cities WHERE name_en IN ('Cairo', 'Alexandria', 'Riyadh', 'Jeddah', 'Dubai', 'Amman', 'Beirut')`,
    );

    console.log('Deleting countries...');
    await queryRunner.query(
      `DELETE FROM countries WHERE name_en IN ('Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Jordan', 'Lebanon')`,
    );

    // Delete clinic database data
    const connection = await mysql.createConnection(this.getMainDatabaseConfig());
    try {
      const [clinicRows] = await connection.query(
        `SELECT id, name, database_name FROM clinics 
         WHERE database_name IS NOT NULL AND database_name != ''`,
      );
      const clinics = clinicRows as any[];

      for (const clinic of clinics) {
        const sanitizedDbName = this.sanitizeDatabaseName(clinic.database_name);
        console.log(`\n[${sanitizedDbName}] Rolling back clinic data...`);

        const clinicConnection = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          user: process.env.DB_USERNAME || 'root',
          password: process.env.DB_PASSWORD || '',
          database: sanitizedDbName,
        });

        try {
          await clinicConnection.query(`DELETE FROM slot_template`);
          await clinicConnection.query(`DELETE FROM services`);
          await clinicConnection.query(`DELETE FROM doctors`);
          await clinicConnection.query(`DELETE FROM branches`);
          await clinicConnection.query(
            `DELETE FROM users WHERE email LIKE '%@%' AND name LIKE '%Admin%' OR name LIKE '%Doctor%'`,
          );
          console.log(`[${sanitizedDbName}] ✓ Clinic data rolled back`);
        } finally {
          await clinicConnection.end();
        }
      }
    } finally {
      await connection.end();
    }

    console.log('\n✓ Rollback completed!');
  }
}

