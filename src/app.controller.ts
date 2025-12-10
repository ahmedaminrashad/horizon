import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import * as bcrypt from 'bcrypt';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test')
  @ApiOperation({ summary: 'Get hashed password for "123"' })
  @ApiResponse({
    status: 200,
    description: 'Returns hashed password for "123"',
    schema: {
      type: 'object',
      properties: {
        password: { type: 'string', example: '$2b$10$...' },
        plainText: { type: 'string', example: '123' },
      },
    },
  })
  async getTestPassword(): Promise<{ password: string; plainText: string }> {
    const hashedPassword = await bcrypt.hash('password123', 10);
    return {
      password: hashedPassword,
      plainText: 'password123',
    };
  }
}
