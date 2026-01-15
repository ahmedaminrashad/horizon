import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LangContextService } from './lang-context.service';

interface Translations {
  [key: string]: any;
}

@Injectable()
export class TranslationService implements OnModuleInit {
  private translations: Map<string, Translations> = new Map();

  constructor(private langContextService: LangContextService) {}

  onModuleInit() {
    this.loadTranslations();
  }

  private loadTranslations() {
    const languages = ['ar', 'en'];

    for (const lang of languages) {
      // Try multiple paths to handle both development and production
      const paths = [
        path.join(__dirname, '../../i18n', `${lang}.json`), // Production: dist/common/services/../../i18n
        path.join(process.cwd(), 'dist', 'i18n', `${lang}.json`), // Production: absolute path
        path.join(process.cwd(), 'src', 'i18n', `${lang}.json`), // Development: src/i18n
      ];

      let loaded = false;
      for (const filePath of paths) {
        try {
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const translations = JSON.parse(fileContent);
            this.translations.set(lang, translations);
            console.log(`Successfully loaded translations for ${lang} from ${filePath}`);
            loaded = true;
            break;
          }
        } catch (error) {
          // Continue to next path
          continue;
        }
      }

      if (!loaded) {
        console.error(`Failed to load translations for ${lang} from any path`);
        this.translations.set(lang, {});
      }
    }
  }

  translate(key: string, lang?: string, params?: Record<string, any>): string {
    const targetLang = lang || this.langContextService.getLang();
    const translations = this.translations.get(targetLang) || this.translations.get('ar') || {};
    const keys = key.split('.');
    let value: any = translations;

    // Navigate through the translation object using the keys
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Arabic if translation not found in target language
        const arTranslations = this.translations.get('ar') || {};
        let arValue: any = arTranslations;
        let foundInAr = true;
        for (const arKey of keys) {
          if (arValue && typeof arValue === 'object' && arKey in arValue) {
            arValue = arValue[arKey];
          } else {
            foundInAr = false;
            break;
          }
        }
        if (foundInAr && typeof arValue === 'string') {
          value = arValue;
          break;
        }
        // If not found in either language, return key
        console.warn(`Translation key not found: ${key} for language: ${targetLang}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string for key: ${key}, value:`, value);
      return key;
    }

    // Replace parameters in translation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }

    return value;
  }

  /**
   * Translate a message using pattern matching
   * @param message The message to translate
   * @param lang Optional language (defaults to current request language)
   * @returns Translated message
   */
  t(message: string, lang?: string): string {
    const targetLang = lang || this.langContextService.getLang();
    const messageLower = message.toLowerCase();

    // Try to match common patterns
    // Pattern: "{Resource} with ID {id} not found"
    const notFoundWithIdMatch = message.match(/(\w+)\s+with\s+ID\s+(\d+)\s+not\s+found/i);
    if (notFoundWithIdMatch) {
      const resource = notFoundWithIdMatch[1];
      const id = notFoundWithIdMatch[2];
      return this.translate('exceptions.NOT_FOUND_WITH_ID', targetLang, { resource, id });
    }

    // Invalid credentials
    if (messageLower.includes('invalid credentials')) {
      return this.translate('exceptions.INVALID_CREDENTIALS', targetLang);
    }

    // Generic patterns
    if (messageLower.includes('email') && messageLower.includes('already exists')) {
      return this.translate('exceptions.EMAIL_EXISTS', targetLang);
    }

    if (messageLower.includes('phone') && messageLower.includes('already exists')) {
      return this.translate('exceptions.PHONE_EXISTS', targetLang);
    }

    if (messageLower.includes('not found')) {
      return this.translate('exceptions.NOT_FOUND', targetLang);
    }

    // Return original message if no pattern matches
    return message;
  }
}
