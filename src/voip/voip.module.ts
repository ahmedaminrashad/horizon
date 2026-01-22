import { Module } from '@nestjs/common';
import { IvrApiService } from './services/ivr-api.service';

@Module({
  providers: [IvrApiService],
  exports: [IvrApiService],
})
export class VoipModule {}
