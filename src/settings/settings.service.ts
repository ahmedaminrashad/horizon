import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  private readonly SETTINGS_ID = 1;

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  /**
   * Get the first (and only) settings record
   * Creates it if it doesn't exist
   */
  async findOne(): Promise<Setting> {
    let setting = await this.settingsRepository.findOne({
      where: { id: this.SETTINGS_ID },
    });

    // If no settings exist, create default one with id: 1
    if (!setting) {
      setting = this.settingsRepository.create({ id: this.SETTINGS_ID });
      setting = await this.settingsRepository.save(setting);
    }

    return setting;
  }

  /**
   * Update only the first (id: 1) settings record
   * Creates it if it doesn't exist
   */
  async update(updateSettingDto: UpdateSettingDto): Promise<Setting> {
    // Always work with the first record (id: 1)
    let setting = await this.settingsRepository.findOne({
      where: { id: this.SETTINGS_ID },
    });

    // If no settings exist, create one with id: 1
    if (!setting) {
      setting = this.settingsRepository.create({ id: this.SETTINGS_ID });
    }

    // Update only the first record
    Object.assign(setting, updateSettingDto);
    return this.settingsRepository.save(setting);
  }

  /**
   * Ensure only one settings record exists (id: 1)
   * Removes any other records if they exist
   */
  async ensureSingleRecord(): Promise<void> {
    const allSettings = await this.settingsRepository.find({
      order: { id: 'ASC' },
    });

    // If there are multiple records, keep only the first one (id: 1)
    if (allSettings.length > 1) {
      const idsToDelete = allSettings
        .filter((s) => s.id !== this.SETTINGS_ID)
        .map((s) => s.id);

      if (idsToDelete.length > 0) {
        await this.settingsRepository.delete(idsToDelete);
      }
    }

    // If no record exists, create the first one
    if (allSettings.length === 0) {
      const setting = this.settingsRepository.create({ id: this.SETTINGS_ID });
      await this.settingsRepository.save(setting);
    }
  }
}
