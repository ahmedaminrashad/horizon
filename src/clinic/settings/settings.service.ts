import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Setting } from './entities/setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class ClinicSettingsService {
  private readonly SETTINGS_ID = 1;

  constructor(
    private tenantRepositoryService: TenantRepositoryService,
  ) {}

  /**
   * Get repository for the current tenant context
   */
  private async getRepository(): Promise<Repository<Setting>> {
    const repository = await this.tenantRepositoryService.getRepository<Setting>(
      Setting,
    );

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  /**
   * Get the first (and only) settings record
   * Creates it if it doesn't exist
   */
  async findOne(): Promise<Setting> {
    const repository = await this.getRepository();
    
    let setting = await repository.findOne({
      where: { id: this.SETTINGS_ID },
    });

    // If no settings exist, create default one with id: 1
    if (!setting) {
      setting = repository.create({ id: this.SETTINGS_ID });
      setting = await repository.save(setting);
    }

    return setting;
  }

  /**
   * Update only the first (id: 1) settings record
   * Creates it if it doesn't exist
   */
  async update(updateSettingDto: UpdateSettingDto): Promise<Setting> {
    const repository = await this.getRepository();
    
    // Always work with the first record (id: 1)
    let setting = await repository.findOne({
      where: { id: this.SETTINGS_ID },
    });

    // If no settings exist, create one with id: 1
    if (!setting) {
      setting = repository.create({ id: this.SETTINGS_ID });
    }

    // Update only the first record
    Object.assign(setting, updateSettingDto);
    return repository.save(setting);
  }

  /**
   * Ensure only one settings record exists (id: 1)
   * Removes any other records if they exist
   */
  async ensureSingleRecord(): Promise<void> {
    const repository = await this.getRepository();
    
    const allSettings = await repository.find({
      order: { id: 'ASC' },
    });

    // If there are multiple records, keep only the first one (id: 1)
    if (allSettings.length > 1) {
      const idsToDelete = allSettings
        .filter((s) => s.id !== this.SETTINGS_ID)
        .map((s) => s.id);

      if (idsToDelete.length > 0) {
        await repository.delete(idsToDelete);
      }
    }

    // If no record exists, create the first one
    if (allSettings.length === 0) {
      const setting = repository.create({ id: this.SETTINGS_ID });
      await repository.save(setting);
    }
  }
}
