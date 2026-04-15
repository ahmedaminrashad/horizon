import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return 'Hello World!';
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
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    return {
      password: hashedPassword,
      plainText: 'Password123!',
    };
  }
}
