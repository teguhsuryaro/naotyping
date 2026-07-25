import {
  CharSample,
  SessionState,
  LiveTick,
  FinalResult,
  calculateFinalResult,
  calculateRollingWpm
} from './scoring.ts';
import { getRandomWords } from './wordGenerator.ts';

// Import word banks
import idContent from '../i18n/content/id.json';
import enContent from '../i18n/content/en.json';

const TEST_DURATION_SEC = 60;
const TICK_INTERVAL_MS = 500;

export class TypingEngineImpl {
  private state: SessionState;
  private wordBank: string[] = [];
  
  private inputElement: HTMLInputElement | HTMLTextAreaElement;
  private displayElement: HTMLElement;
  
  private tickCallbacks: ((tick: LiveTick) => void)[] = [];
  private finishCallbacks: ((result: FinalResult) => void)[] = [];
  
  private timerIntervalId: number | null = null;
  private previousRollingWpm: number = 0;
  
  constructor(
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    displayElement: HTMLElement
  ) {
    this.inputElement = inputElement;
    this.displayElement = displayElement;
    
    this.state = this.getInitialState();
    this.setupListeners();
  }
  
  private getInitialState(): SessionState {
    return {
      isStarted: false,
      isFinished: false,
      startTime: null,
      samples: [],
      totalCorrectChars: 0,
      totalTypedChars: 0,
      totalIncorrectChars: 0
    };
  }
  
  private getWordBank(lang: string): string[] {
    if (lang === 'en') {
      return enContent.words;
    }
    return idContent.words; // Default to ID
  }
  
  public start(languageCode: string): void {
    this.wordBank = this.getWordBank(languageCode);
    this.reset();
  }
  
  public onTick(cb: (tick: LiveTick) => void): void {
    this.tickCallbacks.push(cb);
  }
  
  public onFinish(cb: (result: FinalResult) => void): void {
    this.finishCallbacks.push(cb);
  }
  
  public reset(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    
    this.state = this.getInitialState();
    this.previousRollingWpm = 0;
    
    this.inputElement.disabled = false;
    this.inputElement.value = '';
    
    // Broadcast initial state
    this.triggerTick(TEST_DURATION_SEC, 0);
    
    this.generateAndRenderWords();
  }
  
  private setupListeners(): void {
    this.inputElement.addEventListener('input', () => {
      this.handleInput();
    });
    
    // Prevent typing enter or tabs in the typing test
    this.inputElement.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter') {
        e.preventDefault();
      }
    });
  }
  
  private handleInput(): void {
    if (this.state.isFinished) return;
    
    const inputValue = this.inputElement.value;
    
    // Auto-start on the first typed character
    if (!this.state.isStarted && inputValue.length > 0) {
      this.state.isStarted = true;
      this.state.startTime = performance.now();
      this.startTimer();
    }
    
    const activeSpan = this.displayElement.querySelector('.active') as HTMLElement | null;
    if (!activeSpan) return;
    
    const targetWord = activeSpan.innerText;
    
    // Check if word is complete (user typed space)
    if (inputValue.endsWith(' ')) {
      const typedWord = inputValue.slice(0, -1); // Remove space at the end
      
      if (typedWord.length > 0) {
        const isCorrect = typedWord === targetWord;
        
        // Log characters
        this.state.totalTypedChars += targetWord.length;
        if (isCorrect) {
          this.state.totalCorrectChars += targetWord.length;
          activeSpan.classList.replace('active', 'correct');
        } else {
          this.state.totalIncorrectChars += targetWord.length;
          activeSpan.classList.replace('active', 'incorrect');
        }
        
        // Save sample for rolling calculations
        const sample: CharSample = {
          timestampMs: performance.now(),
          isCorrect,
          charCount: targetWord.length
        };
        this.state.samples.push(sample);
        
        // Clear input for next word
        this.inputElement.value = '';
        
        // Move active state to next word
        const nextSpan = activeSpan.nextElementSibling as HTMLElement | null;
        if (nextSpan) {
          nextSpan.classList.add('active');
        } else {
          // If we reached the end of the line, generate a new set of words
          this.generateAndRenderWords();
        }
      } else {
        // If it's just a space with nothing else, clear it
        this.inputElement.value = '';
      }
    } else {
      // Real-time mistype highlight (active character feedback)
      if (!targetWord.startsWith(inputValue)) {
        activeSpan.classList.add('error-text');
      } else {
        activeSpan.classList.remove('error-text');
      }
    }
  }
  
  private generateAndRenderWords(): void {
    this.displayElement.innerHTML = '';
    const words = getRandomWords(this.wordBank, 15);
    
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.innerText = word;
      span.classList.add('word');
      if (index === 0) {
        span.classList.add('active');
      }
      this.displayElement.appendChild(span);
      this.displayElement.appendChild(document.createTextNode(' '));
    });
  }
  
  private startTimer(): void {
    this.timerIntervalId = window.setInterval(() => {
      if (!this.state.startTime) return;
      
      const elapsedMs = performance.now() - this.state.startTime;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const timeLeftSec = Math.max(0, TEST_DURATION_SEC - elapsedSec);
      
      // Calculate rolling WPM
      const rollingWpm = calculateRollingWpm(this.state.samples, this.previousRollingWpm);
      this.previousRollingWpm = rollingWpm;
      
      this.triggerTick(timeLeftSec, rollingWpm);
      
      if (timeLeftSec <= 0) {
        this.finishGame();
      }
    }, TICK_INTERVAL_MS);
  }
  
  private triggerTick(timeLeftSec: number, rollingWpm: number): void {
    const roundedWpm = Math.round(rollingWpm);
    this.tickCallbacks.forEach(cb => cb({ timeLeftSec, rollingWpm: roundedWpm }));
  }
  
  private finishGame(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    
    this.state.isFinished = true;
    this.inputElement.disabled = true;
    
    const finalResult = calculateFinalResult(this.state, TEST_DURATION_SEC);
    this.finishCallbacks.forEach(cb => cb(finalResult));
  }
}
