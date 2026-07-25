import { FinalResult } from '../engine/scoring.ts';
import { LanguageManager } from '../ui/languageSwitcher.ts';
import './resultsCard.css';

// SVG Icons
const RESTART_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73"/></svg>`;

export interface ResultsCard {
  mount(container: HTMLElement): void;
  show(result: FinalResult): void;
  hide(): void;
  registerTick(rollingWpm: number): void;
}

export class ResultsCardImpl implements ResultsCard {
  private container: HTMLElement | null = null;
  private languageManager: LanguageManager;
  private onRestartCallback: (() => void) | null = null;
  
  private rollingWpmHistory: number[] = [];
  private currentAnimationFrames: number[] = [];
  
  constructor(languageManager: LanguageManager) {
    this.languageManager = languageManager;
    
    this.languageManager.onUiLangChange(() => {
      const el = document.getElementById('res-consistency');
      if (el) {
        const consistency = this.calculateConsistency();
        el.textContent = this.languageManager.translateText(consistency.textKey);
        el.className = `result-value ${consistency.class}`;
      }
    });
  }
  
  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = '';
    this.hide();
  }
  
  public registerTick(rollingWpm: number): void {
    this.rollingWpmHistory.push(rollingWpm);
  }
  
  public onRestart(cb: () => void): void {
    this.onRestartCallback = cb;
  }
  
  public show(result: FinalResult): void {
    if (!this.container) return;
    
    // Stop any ongoing animations
    this.cancelAnimations();
    
    // Calculate consistency based on rolling WPMs history
    const consistency = this.calculateConsistency();
    const consistencyText = this.languageManager.translateText(consistency.textKey);
    
    this.container.innerHTML = `
      <div class="results-card-container">
        <h2 data-i18n="app.title" style="font-size: var(--fs-heading); text-align: center; margin-bottom: 8px;">
          ${this.languageManager.translateText('app.title')}
        </h2>
        
        <div class="results-grid">
          <!-- WPM -->
          <div class="result-box result-box-wpm">
            <span class="result-value" id="res-wpm">0</span>
            <span class="result-label" data-i18n="stats.wpm">${this.languageManager.translateText('stats.wpm')}</span>
          </div>
          
          <!-- Accuracy -->
          <div class="result-box result-box-accuracy">
            <span class="result-value" id="res-acc">0%</span>
            <span class="result-label" data-i18n="stats.accuracy">${this.languageManager.translateText('stats.accuracy')}</span>
          </div>
          
          <!-- Correct Chars -->
          <div class="result-box result-box-correct">
            <span class="result-value" id="res-correct">0</span>
            <span class="result-label" data-i18n="stats.correctChars">${this.languageManager.translateText('stats.correctChars')}</span>
          </div>
          
          <!-- Incorrect Chars -->
          <div class="result-box result-box-incorrect">
            <span class="result-value" id="res-incorrect">0</span>
            <span class="result-label" data-i18n="stats.incorrectChars">${this.languageManager.translateText('stats.incorrectChars')}</span>
          </div>
          
          <!-- Raw WPM -->
          <div class="result-box result-box-raw">
            <span class="result-value" id="res-raw">0</span>
            <span class="result-label" data-i18n="stats.rawWpm">${this.languageManager.translateText('stats.rawWpm')}</span>
          </div>
          
          <!-- Consistency -->
          <div class="result-box result-box-consistency">
            <span class="result-value ${consistency.class}" id="res-consistency">${consistencyText}</span>
            <span class="result-label" data-i18n="stats.consistency">${this.languageManager.translateText('stats.consistency')}</span>
          </div>
        </div>
        
        <button id="res-restart-btn" class="btn-primary">
          ${RESTART_ICON}
          <span data-i18n="button.restart">${this.languageManager.translateText('button.restart')}</span>
        </button>
      </div>
    `;
    
    // Animate stats
    this.animateValue('res-wpm', 0, result.finalWpm, '');
    this.animateValue('res-acc', 0, result.accuracy, '%');
    this.animateValue('res-correct', 0, result.correctChars, '');
    this.animateValue('res-incorrect', 0, result.incorrectChars, '');
    this.animateValue('res-raw', 0, result.rawWpm, '');
    
    // Hook restart button
    const restartBtn = this.container.querySelector('#res-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this.onRestartCallback) {
          this.onRestartCallback();
        }
      });
    }
    
    this.container.style.display = 'block';
  }
  
  public hide(): void {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
    }
    this.rollingWpmHistory = [];
    this.cancelAnimations();
  }
  
  private cancelAnimations(): void {
    this.currentAnimationFrames.forEach(frame => cancelAnimationFrame(frame));
    this.currentAnimationFrames = [];
  }
  
  private calculateConsistency(): { class: string; textKey: string } {
    if (this.rollingWpmHistory.length === 0) {
      return { class: 'consistency-stable', textKey: 'consistency.stable' };
    }
    
    const n = this.rollingWpmHistory.length;
    const mean = this.rollingWpmHistory.reduce((s, val) => s + val, 0) / n;
    const variance = this.rollingWpmHistory.reduce((s, val) => s + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev < 5) {
      return { class: 'consistency-stable', textKey: 'consistency.stable' };
    } else if (stdDev < 12) {
      return { class: 'consistency-fair', textKey: 'consistency.fair' };
    } else {
      return { class: 'consistency-fluctuating', textKey: 'consistency.fluctuating' };
    }
  }
  
  private animateValue(id: string, start: number, end: number, suffix: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `${end}${suffix}`;
      return;
    }
    
    const duration = 900;
    const startTime = performance.now();
    
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentValue = Math.round(start + (end - start) * easeOutCubic(progress));
      el.textContent = `${currentValue}${suffix}`;
      
      if (progress < 1) {
        const frame = requestAnimationFrame(update);
        this.currentAnimationFrames.push(frame);
      }
    };
    
    const frame = requestAnimationFrame(update);
    this.currentAnimationFrames.push(frame);
  }
}
