import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Country } from '../countries/entities/country.entity';
import { City } from '../cities/entities/city.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchesRepository: Repository<Branch>,
    @InjectRepository(Clinic)
    private clinicsRepository: Repository<Clinic>,
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
    @InjectRepository(City)
    private citiesRepository: Repository<City>,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    // Validate clinic exists
    const clinic = await this.clinicsRepository.findOne({
      where: { id: createBranchDto.clinic_id },
    });

    if (!clinic) {
      throw new NotFoundException(
        `Clinic with ID ${createBranchDto.clinic_id} not found`,
      );
    }

    // Validate country if provided
    if (createBranchDto.country_id) {
      const country = await this.countriesRepository.findOne({
        where: { id: createBranchDto.country_id },
      });
      if (!country) {
        throw new NotFoundException(
          `Country with ID ${createBranchDto.country_id} not found`,
        );
      }
    }

    // Validate city if provided
    if (createBranchDto.city_id) {
      const city = await this.citiesRepository.findOne({
        where: { id: createBranchDto.city_id },
      });
      if (!city) {
        throw new NotFoundException(
          `City with ID ${createBranchDto.city_id} not found`,
        );
      }
    }

    const branch = this.branchesRepository.create(createBranchDto);
    return this.branchesRepository.save(branch);
  }

  async findAll(page: number = 1, limit: number = 10, clinicId?: number) {
    const skip = (page - 1) * limit;
    const where = clinicId ? { clinic_id: clinicId } : {};

    const [data, total] = await this.branchesRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['clinic', 'country', 'city'],
      order: {
        createdAt: 'DESC',
      },
    });

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

  async findOne(id: number): Promise<Branch> {
    const branch = await this.branchesRepository.findOne({
      where: { id },
      relations: ['clinic', 'country', 'city'],
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async update(id: number, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);

    // Validate clinic if being updated
    if (updateBranchDto.clinic_id) {
      const clinic = await this.clinicsRepository.findOne({
        where: { id: updateBranchDto.clinic_id },
      });
      if (!clinic) {
        throw new NotFoundException(
          `Clinic with ID ${updateBranchDto.clinic_id} not found`,
        );
      }
    }

    // Validate country if being updated
    if (updateBranchDto.country_id) {
      const country = await this.countriesRepository.findOne({
        where: { id: updateBranchDto.country_id },
      });
      if (!country) {
        throw new NotFoundException(
          `Country with ID ${updateBranchDto.country_id} not found`,
        );
      }
    }

    // Validate city if being updated
    if (updateBranchDto.city_id) {
      const city = await this.citiesRepository.findOne({
        where: { id: updateBranchDto.city_id },
      });
      if (!city) {
        throw new NotFoundException(
          `City with ID ${updateBranchDto.city_id} not found`,
        );
      }
    }

    Object.assign(branch, updateBranchDto);
    return this.branchesRepository.save(branch);
  }

  async remove(id: number): Promise<void> {
    const branch = await this.findOne(id);
    await this.branchesRepository.remove(branch);
  }

  async findByClinicBranchId(
    clinicId: number,
    clinicBranchId: number,
  ): Promise<Branch | null> {
    return this.branchesRepository.findOne({
      where: {
        clinic_id: clinicId,
        clinic_branch_id: clinicBranchId,
      },
    });
  }

  async syncBranch(
    clinicId: number,
    clinicBranchId: number,
    branchData: {
      name: string;
      lat?: number;
      longit?: number;
      country_id?: number;
      city_id?: number;
      address?: string;
    },
  ): Promise<Branch> {
    const existingBranch = await this.findByClinicBranchId(
      clinicId,
      clinicBranchId,
    );

    if (existingBranch) {
      // Update existing branch
      Object.assign(existingBranch, {
        name: branchData.name,
        lat: branchData.lat,
        longit: branchData.longit,
        country_id: branchData.country_id,
        city_id: branchData.city_id,
        address: branchData.address,
      });
      return this.branchesRepository.save(existingBranch);
    } else {
      // Create new branch
      const branch = this.branchesRepository.create({
        name: branchData.name,
        clinic_id: clinicId,
        clinic_branch_id: clinicBranchId,
        lat: branchData.lat,
        longit: branchData.longit,
        country_id: branchData.country_id,
        city_id: branchData.city_id,
        address: branchData.address,
      });
      return this.branchesRepository.save(branch);
    }
  }
}
