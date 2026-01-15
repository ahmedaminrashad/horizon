import { Global, Module } from '@nestjs/common';
import { TranslationService } from './services/translation.service';
import { LangContextService } from './services/lang-context.service';

@Global()
@Module({
  providers: [TranslationService, LangContextService],
  exports: [TranslationService, LangContextService],
})
export class CommonModule {}
