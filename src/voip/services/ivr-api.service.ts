import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

@Injectable()
export class IvrApiService {
  private readonly logger = new Logger(IvrApiService.name);
  private readonly baseUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get('IVR_BASE_URL', 'http://18.198.48.18:300');
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds timeout
    });
  }

  /**
   * Add IVR Queue for a clinic
   * @param clinicId Clinic ID
   * @param extension Extension number
   * @param audioFiles Optional audio files
   */
  async addIVRQueue(
    clinicId: number,
    extension: string,
    audioFiles?: Record<string, Express.Multer.File>,
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('clinic_id', clinicId.toString());
      formData.append('extension', extension);

      // Add audio files if provided
      if (audioFiles) {
        const audioFileTypes = [
          'welcome_ar',
          'welcome_en',
          'main_menu_ar',
          'main_menu_en',
          'invalid_ar',
          'invalid_en',
          'timeout_ar',
          'timeout_en',
          'please_select_ar',
          'please_select_en',
          'services_ar',
          'services_en',
          'opening_hours_ar',
          'opening_hours_en',
          'goodbye_ar',
          'goodbye_en',
        ];

        for (const fileType of audioFileTypes) {
          if (audioFiles[fileType]) {
            formData.append(fileType, audioFiles[fileType].buffer, {
              filename: audioFiles[fileType].originalname,
              contentType: audioFiles[fileType].mimetype,
            });
          }
        }
      }

      const response = await this.axiosInstance.post('/api/AddIVRQueue', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to add IVR queue for clinic ${clinicId}`, error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `IVR API error: ${error.response?.data?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Upload IVR audio file
   */
  async uploadIVRAudio(
    extension: string,
    fileType: string,
    file: Express.Multer.File,
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('extension', extension);
      formData.append('fileType', fileType);
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await this.axiosInstance.post('/api/UploadIVRAudio', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to upload IVR audio for extension ${extension}`, error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `IVR API error: ${error.response?.data?.message || error.message}`,
        );
      }
      throw error;
    }
  }
}
