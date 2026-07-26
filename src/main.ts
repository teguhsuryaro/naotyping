// Import Styles
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/responsive.css';

// Import Modules
import { TypingEngineImpl } from './engine/typingEngine.ts';
import { FireBackgroundImpl } from './fire/fireBackground.ts';
import { ResultsCardImpl } from './results/resultsCard.ts';
import { LanguageManager } from './ui/languageSwitcher.ts';
import { LayoutManager } from './ui/layout.ts';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Layout and Language Managers
  const layout = new LayoutManager();
  const languageManager = new LanguageManager(layout.uiLangSelect, layout.contentLangSelect);
  
  // 2. Initialize Core Engine
  const typingEngine = new TypingEngineImpl(layout.typingInput, layout.wordsDisplay);
  
  // 3. Initialize Fire Background
  const fire = new FireBackgroundImpl();
  fire.mount(layout.fireContainer);
  
  // 4. Initialize Results Card
  const resultsCard = new ResultsCardImpl(languageManager);
  resultsCard.mount(layout.resultsCard);
  
  // 5. Connect Engine Events
  typingEngine.onTick((tick) => {
    // Disable language switching once typing starts
    if (tick.timeLeftSec < 60 && tick.timeLeftSec > 0) {
      languageManager.setContentSelectDisabled(true);
    }
    
    // Update Timer display
    layout.updateTimer(tick.timeLeftSec);
    
    // Update Fire Background
    fire.handleTick(tick);
    
    // Log tick for consistency calculation in results card
    resultsCard.registerTick(tick.rollingWpm);
  });
  
  typingEngine.onFinish((result) => {
    // Enable language selection
    languageManager.setContentSelectDisabled(false);
    
    // Show results
    layout.showResultsArea();
    resultsCard.show(result);
    
    // Reset fire background
    fire.reset();
  });
  
  // 6. Connect Results Actions (Restart)
  resultsCard.onRestart(() => {
    resultsCard.hide();
    fire.reset();
    typingEngine.reset();
    layout.showTypingArea();
    languageManager.setContentSelectDisabled(false);
  });
  
  // 7. Connect Language Selection Updates
  languageManager.onContentLangChange((lang) => {
    typingEngine.start(lang);
  });
  
  // 8. Bootstrap Initial State (Indonesian UI & Content, resets on page load)
  languageManager.setUiLanguage('id');
  languageManager.setContentLanguage('id');
  
  // Initialize Typing Engine
  typingEngine.start('id');
  
  // Focus typing input initially
  layout.typingInput.focus();
});
