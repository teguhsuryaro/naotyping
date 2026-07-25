export type CharSample = {
  timestampMs: number; // performance.now() when word is confirmed (space is pressed)
  isCorrect: boolean;
  charCount: number;   // length of target word
};

export type SessionState = {
  isStarted: boolean;
  isFinished: boolean;
  startTime: number | null; // performance.now() when typing starts
  samples: CharSample[];
  totalCorrectChars: number;
  totalTypedChars: number;
  totalIncorrectChars: number;
};

export type LiveTick = {
  timeLeftSec: number;
  rollingWpm: number;
};

export type FinalResult = {
  finalWpm: number;
  rawWpm: number;
  accuracy: number; // 0-100
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  durationSec: number;
};

export function calculateFinalResult(state: SessionState, durationSec: number): FinalResult {
  const elapsedMinutes = durationSec / 60;
  
  const finalWpm = elapsedMinutes > 0 
    ? Math.round((state.totalCorrectChars / 5) / elapsedMinutes) 
    : 0;
    
  const rawWpm = elapsedMinutes > 0 
    ? Math.round((state.totalTypedChars / 5) / elapsedMinutes) 
    : 0;
    
  const accuracy = state.totalTypedChars > 0 
    ? Math.round((state.totalCorrectChars / state.totalTypedChars) * 100) 
    : 100;

  return {
    finalWpm,
    rawWpm,
    accuracy,
    correctChars: state.totalCorrectChars,
    incorrectChars: state.totalIncorrectChars,
    totalChars: state.totalTypedChars,
    durationSec
  };
}

export function calculateRollingWpm(
  samples: CharSample[],
  previousRollingWpm: number,
  windowMs: number = 5000,
  emaAlpha: number = 0.35
): number {
  const now = performance.now();
  
  // Filter samples that fall within the sliding window
  const recentSamples = samples.filter(s => now - s.timestampMs <= windowMs);
  
  // Sum correct characters in the recent samples
  const recentCorrectChars = recentSamples
    .filter(s => s.isCorrect)
    .reduce((sum, s) => sum + s.charCount, 0);
    
  // Instantaneous WPM for the 5s window
  const windowMinutes = windowMs / 60000;
  const instantWpm = (recentCorrectChars / 5) / windowMinutes;
  
  // Apply Exponential Moving Average (EMA) to smooth out the values
  const rollingWpm = (emaAlpha * instantWpm) + ((1 - emaAlpha) * previousRollingWpm);
  
  return Math.round(rollingWpm * 100) / 100; // Keep 2 decimal places for accuracy, round to int at display
}
