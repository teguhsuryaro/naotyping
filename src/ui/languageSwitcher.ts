import idUi from '../i18n/ui/id.json';
import enUi from '../i18n/ui/en.json';

const dictionaries: Record<string, Record<string, string>> = {
  id: idUi,
  en: enUi
};

export class LanguageManager {
  private currentUiLang: 'id' | 'en' = 'id';
  private currentContentLang: 'id' | 'en' = 'id';
  
  private uiSelectElement: HTMLSelectElement;
  private contentSelectElement: HTMLSelectElement;
  
  private onUiLangChangeCallbacks: ((lang: 'id' | 'en') => void)[] = [];
  private onContentLangChangeCallbacks: ((lang: 'id' | 'en') => void)[] = [];
  
  constructor(
    uiSelectElement: HTMLSelectElement,
    contentSelectElement: HTMLSelectElement
  ) {
    this.uiSelectElement = uiSelectElement;
    this.contentSelectElement = contentSelectElement;
    
    this.setupListeners();
  }
  
  public getUiLanguage(): 'id' | 'en' {
    return this.currentUiLang;
  }
  
  public getContentLanguage(): 'id' | 'en' {
    return this.currentContentLang;
  }
  
  public onUiLangChange(cb: (lang: 'id' | 'en') => void): void {
    this.onUiLangChangeCallbacks.push(cb);
  }
  
  public onContentLangChange(cb: (lang: 'id' | 'en') => void): void {
    this.onContentLangChangeCallbacks.push(cb);
  }
  
  public setUiLanguage(lang: 'id' | 'en'): void {
    this.currentUiLang = lang;
    this.uiSelectElement.value = lang;
    
    document.documentElement.setAttribute('lang', lang);
    
    const elements = document.querySelectorAll('[data-i18n]');
    const dict = dictionaries[lang];
    
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && dict[key]) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          (el as HTMLTextAreaElement | HTMLInputElement).placeholder = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });
    
    this.onUiLangChangeCallbacks.forEach(cb => cb(lang));
  }
  
  public setContentLanguage(lang: 'id' | 'en'): void {
    this.currentContentLang = lang;
    this.contentSelectElement.value = lang;
    this.onContentLangChangeCallbacks.forEach(cb => cb(lang));
  }
  
  public setContentSelectDisabled(disabled: boolean): void {
    this.contentSelectElement.disabled = disabled;
  }
  
  private setupListeners(): void {
    this.uiSelectElement.addEventListener('change', () => {
      const val = this.uiSelectElement.value as 'id' | 'en';
      this.setUiLanguage(val);
    });
    
    this.contentSelectElement.addEventListener('change', () => {
      const val = this.contentSelectElement.value as 'id' | 'en';
      this.setContentLanguage(val);
    });
  }
  
  public translateText(key: string): string {
    const dict = dictionaries[this.currentUiLang];
    return dict[key] || key;
  }
}
export { idUi, enUi };
