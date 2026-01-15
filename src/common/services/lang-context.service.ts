import { Injectable } from '@nestjs/common';

@Injectable()
export class LangContextService {
  private lang: string = 'ar';

  setLang(lang: string): void {
    this.lang = lang || 'ar';
  }

  getLang(): string {
    return this.lang;
  }
}
