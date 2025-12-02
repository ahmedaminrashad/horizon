import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './entities/package.entity';
import { PackageTranslation } from './entities/package-translation.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private packagesRepository: Repository<Package>,
    @InjectRepository(PackageTranslation)
    private translationsRepository: Repository<PackageTranslation>,
  ) {}

  async create(createPackageDto: CreatePackageDto): Promise<Package> {
    const { translations, ...packageData } = createPackageDto;

    // Create package
    const pkg = this.packagesRepository.create(packageData);
    const savedPackage = await this.packagesRepository.save(pkg);

    // Create translations if provided
    if (translations && translations.length > 0) {
      const translationEntities = translations.map((translation) =>
        this.translationsRepository.create({
          ...translation,
          package_id: savedPackage.id,
        }),
      );
      await this.translationsRepository.save(translationEntities);
    }

    // Return package with translations
    return this.findOne(savedPackage.id);
  }

  async findAll(page: number = 1, limit: number = 10, lang?: string) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.packagesRepository
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.translations', 'translation');

    if (lang) {
      queryBuilder.where('translation.lang = :lang', { lang });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('package.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number, lang?: string): Promise<Package> {
    const queryBuilder = this.packagesRepository
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.translations', 'translation')
      .where('package.id = :id', { id });

    if (lang) {
      queryBuilder.andWhere('translation.lang = :lang', { lang });
    }

    const pkg = await queryBuilder.getOne();

    if (!pkg) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }

    return pkg;
  }

  async update(id: number, updatePackageDto: UpdatePackageDto): Promise<Package> {
    const pkg = await this.findOne(id);

    const { translations, ...packageData } = updatePackageDto;

    // Update package data
    if (Object.keys(packageData).length > 0) {
      Object.assign(pkg, packageData);
      await this.packagesRepository.save(pkg);
    }

    // Update translations if provided
    if (translations && translations.length > 0) {
      // Remove existing translations
      await this.translationsRepository.delete({ package_id: id });

      // Create new translations
      const translationEntities = translations.map((translation) =>
        this.translationsRepository.create({
          ...translation,
          package_id: id,
        }),
      );
      await this.translationsRepository.save(translationEntities);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const pkg = await this.findOne(id);
    await this.packagesRepository.remove(pkg);
  }

  async addTranslation(
    packageId: number,
    translation: {
      lang: string;
      name: string;
      content?: string;
    },
  ): Promise<PackageTranslation> {
    const pkg = await this.findOne(packageId);

    // Check if translation already exists
    const existing = await this.translationsRepository.findOne({
      where: { package_id: packageId, lang: translation.lang },
    });

    if (existing) {
      throw new ConflictException(
        `Translation with language "${translation.lang}" already exists for this package`,
      );
    }

    const translationEntity = this.translationsRepository.create({
      ...translation,
      package_id: packageId,
    });

    return this.translationsRepository.save(translationEntity);
  }

  async updateTranslation(
    packageId: number,
    lang: string,
    translation: {
      name?: string;
      content?: string;
    },
  ): Promise<PackageTranslation> {
    const existing = await this.translationsRepository.findOne({
      where: { package_id: packageId, lang },
    });

    if (!existing) {
      throw new NotFoundException(
        `Translation with language "${lang}" not found for package ${packageId}`,
      );
    }

    Object.assign(existing, translation);
    return this.translationsRepository.save(existing);
  }

  async removeTranslation(packageId: number, lang: string): Promise<void> {
    const translation = await this.translationsRepository.findOne({
      where: { package_id: packageId, lang },
    });

    if (!translation) {
      throw new NotFoundException(
        `Translation with language "${lang}" not found for package ${packageId}`,
      );
    }

    await this.translationsRepository.remove(translation);
  }
}
