import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import * as mysql from 'mysql2/promise';

// Load environment variables
config();

/**
 * Manually add branch_id, experience_years, and number_of_patients columns to doctors table
 * This is a workaround if migrations aren't being detected
 */
async function addDoctorsFields() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'horizon',
  };

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to database');

    // Check if branch_id column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'branch_id'`,
      [connectionConfig.database],
    );

    if (Array.isArray(columns) && columns.length === 0) {
      console.log('Adding branch_id column...');
      await connection.query(`
        ALTER TABLE doctors 
        ADD COLUMN branch_id INT NULL
      `);

      // Check if branches table exists before adding FK
      const [branchesTable] = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'branches'`,
        [connectionConfig.database],
      );

      if (Array.isArray(branchesTable) && branchesTable.length > 0) {
        console.log('Adding foreign key constraint for branch_id...');
        await connection.query(`
          ALTER TABLE doctors 
          ADD CONSTRAINT FK_doctors_branch_id 
          FOREIGN KEY (branch_id) REFERENCES branches(id) 
          ON DELETE SET NULL ON UPDATE CASCADE
        `);
      }
      console.log('✓ branch_id column added');
    } else {
      console.log('branch_id column already exists');
    }

    // Check if experience_years column exists
    const [expColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'experience_years'`,
      [connectionConfig.database],
    );

    if (Array.isArray(expColumns) && expColumns.length === 0) {
      console.log('Adding experience_years column...');
      await connection.query(`
        ALTER TABLE doctors 
        ADD COLUMN experience_years INT NULL
      `);
      console.log('✓ experience_years column added');
    } else {
      console.log('experience_years column already exists');
    }

    // Check if number_of_patients column exists
    const [patColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'doctors' AND COLUMN_NAME = 'number_of_patients'`,
      [connectionConfig.database],
    );

    if (Array.isArray(patColumns) && patColumns.length === 0) {
      console.log('Adding number_of_patients column...');
      await connection.query(`
        ALTER TABLE doctors 
        ADD COLUMN number_of_patients INT NULL
      `);
      console.log('✓ number_of_patients column added');
    } else {
      console.log('number_of_patients column already exists');
    }

    console.log('\n✓ All columns added successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

addDoctorsFields();

