import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { Country } from '../countries/entities/country.entity';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private citiesRepository: Repository<City>,
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
  ) {}

  async create(createCityDto: CreateCityDto): Promise<City> {
    // Verify country exists
    const country = await this.countriesRepository.findOne({
      where: { id: createCityDto.country_id },
    });

    if (!country) {
      throw new NotFoundException(
        `Country with ID ${createCityDto.country_id} not found`,
      );
    }

    const city = this.citiesRepository.create(createCityDto);
    return this.citiesRepository.save(city);
  }

  async findAll(page: number = 1, limit: number = 10, countryId?: number) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.citiesRepository
      .createQueryBuilder('city')
      .leftJoinAndSelect('city.country', 'country');

    if (countryId) {
      queryBuilder.where('city.country_id = :countryId', { countryId });
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('city.createdAt', 'DESC')
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

  async findOne(id: number): Promise<City> {
    const city = await this.citiesRepository.findOne({
      where: { id },
      relations: ['country'],
    });

    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    return city;
  }

  async update(id: number, updateCityDto: UpdateCityDto): Promise<City> {
    const city = await this.findOne(id);

    // If country_id is being updated, verify the country exists
    if (updateCityDto.country_id && updateCityDto.country_id !== city.country_id) {
      const country = await this.countriesRepository.findOne({
        where: { id: updateCityDto.country_id },
      });

      if (!country) {
        throw new NotFoundException(
          `Country with ID ${updateCityDto.country_id} not found`,
        );
      }
    }

    Object.assign(city, updateCityDto);
    return this.citiesRepository.save(city);
  }

  async remove(id: number): Promise<void> {
    const city = await this.findOne(id);
    await this.citiesRepository.remove(city);
  }
}

