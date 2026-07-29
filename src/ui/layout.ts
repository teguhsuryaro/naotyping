export class LayoutManager {
  public timerContainer: HTMLElement;
  public timerValue: HTMLElement;
  public progressBarFill: HTMLElement;
  
  public wordsDisplay: HTMLElement;
  public typingInput: HTMLTextAreaElement;
  
  public fireContainer: HTMLElement;
  public typingCard: HTMLElement;
  public resultsCard: HTMLElement;
  
  public uiLangSelect: HTMLSelectElement;
  public contentLangSelect: HTMLSelectElement;
  
  constructor() {
    this.timerContainer = document.getElementById('timer-container') as HTMLElement;
    this.timerValue = document.getElementById('timer-value') as HTMLElement;
    this.progressBarFill = document.getElementById('progress-bar-fill') as HTMLElement;
    
    this.wordsDisplay = document.getElementById('words-display') as HTMLElement;
    this.typingInput = document.getElementById('typing-input') as HTMLTextAreaElement;
    
    this.fireContainer = document.getElementById('fire-container') as HTMLElement;
    this.typingCard = document.getElementById('typing-card') as HTMLElement;
    this.resultsCard = document.getElementById('results-card') as HTMLElement;
    
    this.uiLangSelect = document.getElementById('ui-lang-select') as HTMLSelectElement;
    this.contentLangSelect = document.getElementById('content-lang-select') as HTMLSelectElement;
  }
  
  public updateTimer(seconds: number): void {
    if (this.timerValue) {
      this.timerValue.textContent = seconds.toString();
      
      // Update progress bar
      const progress = (seconds / 60) * 100;
      if (this.progressBarFill) {
        this.progressBarFill.style.width = `${progress}%`;
        
        // Change color when <= 10s
        if (seconds <= 10) {
          this.progressBarFill.classList.add('warning');
        } else {
          this.progressBarFill.classList.remove('warning');
        }
      }
      
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
      
      // Reset progress bar
      if (this.progressBarFill) {
        this.progressBarFill.style.width = '100%';
        this.progressBarFill.classList.remove('warning');
      }
      
      // Force repaint
      this.typingCard.getBoundingClientRect();
      this.typingCard.classList.remove('fade-out');
      this.typingCard.classList.add('fade-in');
      
      this.typingInput.focus();
    }, 400);
  }
}
