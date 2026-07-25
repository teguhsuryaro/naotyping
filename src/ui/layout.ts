export class LayoutManager {
  public timerContainer: HTMLElement;
  public timerValue: HTMLElement;
  
  public wordsDisplay: HTMLElement;
  public typingInput: HTMLTextAreaElement;
  
  public creatureArena: HTMLElement;
  public typingCard: HTMLElement;
  public resultsCard: HTMLElement;
  
  public uiLangSelect: HTMLSelectElement;
  public contentLangSelect: HTMLSelectElement;
  
  constructor() {
    this.timerContainer = document.getElementById('timer-container') as HTMLElement;
    this.timerValue = document.getElementById('timer-value') as HTMLElement;
    
    this.wordsDisplay = document.getElementById('words-display') as HTMLElement;
    this.typingInput = document.getElementById('typing-input') as HTMLTextAreaElement;
    
    this.creatureArena = document.getElementById('creature-arena') as HTMLElement;
    this.typingCard = document.getElementById('typing-card') as HTMLElement;
    this.resultsCard = document.getElementById('results-card') as HTMLElement;
    
    this.uiLangSelect = document.getElementById('ui-lang-select') as HTMLSelectElement;
    this.contentLangSelect = document.getElementById('content-lang-select') as HTMLSelectElement;
  }
  
  public updateTimer(seconds: number): void {
    if (this.timerValue) {
      this.timerValue.textContent = seconds.toString();
      
      // Visual feedback: red glow when timer is <= 10s
      if (seconds <= 10) {
        this.timerContainer.classList.add('timer-warning');
      } else {
        this.timerContainer.classList.remove('timer-warning');
      }
    }
  }
  
  public showResultsArea(): void {
    // Smooth transition
    this.typingCard.classList.add('fade-out');
    
    setTimeout(() => {
      this.typingCard.style.display = 'none';
      this.resultsCard.style.display = 'block';
      
      // Force repaint
      this.resultsCard.getBoundingClientRect();
      this.resultsCard.classList.remove('fade-out');
      this.resultsCard.classList.add('fade-in');
    }, 400);
  }
  
  public showTypingArea(): void {
    this.resultsCard.classList.remove('fade-in');
    this.resultsCard.classList.add('fade-out');
    
    setTimeout(() => {
      this.resultsCard.style.display = 'none';
      this.typingCard.style.display = 'flex';
      
      // Force repaint
      this.typingCard.getBoundingClientRect();
      this.typingCard.classList.remove('fade-out');
      this.typingCard.classList.add('fade-in');
      
      this.typingInput.focus();
    }, 400);
  }
}
