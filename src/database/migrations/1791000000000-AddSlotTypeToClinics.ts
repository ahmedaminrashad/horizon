import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSlotTypeToClinics1791000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');

    if (!table) {
      console.log('Table "clinics" does not exist, skipping migration');
      return;
    }

    // Check if slot_type column already exists
    const slotTypeColumn = table.findColumnByName('slot_type');
    if (!slotTypeColumn) {
      await queryRunner.query(`
        ALTER TABLE clinics 
        ADD COLUMN slot_type ENUM('slots', 'walk-in-windows') 
        DEFAULT 'slots' 
        NULL
      `);
      console.log('Added slot_type column to clinics table');
    } else {
      console.log('slot_type column already exists in clinics table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');

    if (!table) {
      return;
    }

    const slotTypeColumn = table.findColumnByName('slot_type');
    if (slotTypeColumn) {
      await queryRunner.dropColumn('clinics', 'slot_type');
      console.log('Removed slot_type column from clinics table');
    }
  }
}

