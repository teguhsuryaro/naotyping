import { LiveTick } from '../engine/scoring.ts';
import './fireBackground.css';

/**
 * Fire Background — dynamic fire particle effect that responds to WPM.
 * 
 * Levels (0-5) based on ~15 WPM increments:
 *   0 = idle (no fire)
 *   1 = 1-15 WPM (sparks)
 *   2 = 16-30 WPM (small flames)
 *   3 = 31-45 WPM (medium fire)
 *   4 = 46-60 WPM (large fire)
 *   5 = 60+ WPM (inferno)
 */

export interface FireBackground {
  mount(container: HTMLElement): void;
  handleTick(tick: LiveTick): void;
  reset(): void;
  destroy(): void;
}

// Configuration per fire level
interface LevelConfig {
  spawnIntervalMs: number; // ms between particle spawns
  particleCount: number;   // particles per spawn burst
  minSize: number;         // px
  maxSize: number;         // px
  minHeight: number;       // px (how high particles rise)
  maxHeight: number;       // px
  maxOpacity: number;      // 0-1
  durationMs: number;      // animation duration
  audioVolume: number;     // 0-1
}

const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 0: No fire
  { spawnIntervalMs: 0, particleCount: 0, minSize: 0, maxSize: 0, minHeight: 0, maxHeight: 0, maxOpacity: 0, durationMs: 0, audioVolume: 0 },
  // Level 1: 15 WPM
  { spawnIntervalMs: 600, particleCount: 1, minSize: 3, maxSize: 6, minHeight: 40, maxHeight: 80, maxOpacity: 0.3, durationMs: 2200, audioVolume: 0.04 },
  // Level 2: 30 WPM
  { spawnIntervalMs: 400, particleCount: 2, minSize: 4, maxSize: 9, minHeight: 60, maxHeight: 120, maxOpacity: 0.4, durationMs: 2000, audioVolume: 0.08 },
  // Level 3: 40 WPM
  { spawnIntervalMs: 300, particleCount: 2, minSize: 5, maxSize: 10, minHeight: 80, maxHeight: 160, maxOpacity: 0.5, durationMs: 1900, audioVolume: 0.12 },
  // Level 4: 50 WPM
  { spawnIntervalMs: 200, particleCount: 3, minSize: 6, maxSize: 12, minHeight: 100, maxHeight: 200, maxOpacity: 0.55, durationMs: 1800, audioVolume: 0.16 },
  // Level 5: 65 WPM
  { spawnIntervalMs: 150, particleCount: 4, minSize: 7, maxSize: 14, minHeight: 120, maxHeight: 250, maxOpacity: 0.6, durationMs: 1700, audioVolume: 0.20 },
  // Level 6: 80 WPM
  { spawnIntervalMs: 100, particleCount: 4, minSize: 8, maxSize: 16, minHeight: 150, maxHeight: 300, maxOpacity: 0.7, durationMs: 1600, audioVolume: 0.25 },
  // Level 7: 100 WPM
  { spawnIntervalMs: 80, particleCount: 5, minSize: 9, maxSize: 18, minHeight: 200, maxHeight: 400, maxOpacity: 0.75, durationMs: 1500, audioVolume: 0.30 },
  // Level 8: 125 WPM
  { spawnIntervalMs: 60, particleCount: 6, minSize: 10, maxSize: 22, minHeight: 250, maxHeight: 500, maxOpacity: 0.8, durationMs: 1300, audioVolume: 0.35 },
  // Level 9: 160 WPM
  { spawnIntervalMs: 40, particleCount: 8, minSize: 12, maxSize: 26, minHeight: 350, maxHeight: 700, maxOpacity: 0.9, durationMs: 1100, audioVolume: 0.45 },
  // Level 10: 200 WPM (Inferno / Full screen)
  { spawnIntervalMs: 20, particleCount: 12, minSize: 15, maxSize: 35, minHeight: 500, maxHeight: 1200, maxOpacity: 1.0, durationMs: 900, audioVolume: 0.6 },
];

const PARTICLE_COLORS = ['ember', 'orange', 'yellow', 'white'];
const LEVEL_CHANGE_DELAY_MS = 700;

export class FireBackgroundImpl implements FireBackground {
  private container: HTMLElement | null = null;
  
  private currentLevel: number = 0;
  private targetLevel: number = 0;
  private levelChangeTimeout: number | null = null;
  
  private spawnIntervalId: number | null = null;
  
  // Audio
  private audioElement: HTMLAudioElement | null = null;
  private audioReady: boolean = false;
  private audioStarted: boolean = false;
  private targetVolume: number = 0;
  private volumeAnimationId: number | null = null;
  
  // Reduced motion
  private prefersReducedMotion: boolean = false;
  
  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initAudio();
  }
  
  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.classList.add('fire-container', 'fire-level-0');
  }
  
  public handleTick(tick: LiveTick): void {
    let newLevel = 0;
    
    if (tick.timeLeftSec > 0 && tick.rollingWpm > 0) {
      const wpm = tick.rollingWpm;
      if (wpm <= 15) newLevel = 1;
      else if (wpm <= 30) newLevel = 2;
      else if (wpm <= 40) newLevel = 3;
      else if (wpm <= 50) newLevel = 4;
      else if (wpm <= 65) newLevel = 5;
      else if (wpm <= 80) newLevel = 6;
      else if (wpm <= 100) newLevel = 7;
      else if (wpm <= 125) newLevel = 8;
      else if (wpm <= 160) newLevel = 9;
      else newLevel = 10;
    } else {
      newLevel = 0;
    }
    
    if (newLevel !== this.targetLevel) {
      this.targetLevel = newLevel;
      
      // Debounce level transitions
      if (this.levelChangeTimeout !== null) {
        window.clearTimeout(this.levelChangeTimeout);
      }
      
      this.levelChangeTimeout = window.setTimeout(() => {
        this.applyLevel(this.targetLevel);
      }, LEVEL_CHANGE_DELAY_MS);
    }
  }
  
  public reset(): void {
    // Clear pending transitions
    if (this.levelChangeTimeout !== null) {
      window.clearTimeout(this.levelChangeTimeout);
      this.levelChangeTimeout = null;
    }
    
    this.targetLevel = 0;
    this.applyLevel(0);
    
    // Clear all particles
    if (this.container) {
      const particles = this.container.querySelectorAll('.fire-particle');
      particles.forEach(p => p.remove());
    }
    
    // Stop audio
    this.fadeAudioTo(0);
  }
  
  public destroy(): void {
    this.reset();
    this.stopSpawner();
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    
    if (this.volumeAnimationId !== null) {
      cancelAnimationFrame(this.volumeAnimationId);
    }
  }
  
  // ──────────────────────── Private ────────────────────────
  
  private initAudio(): void {
    try {
      this.audioElement = new Audio('/audio/fire-crackle.mp3');
      this.audioElement.loop = true;
      this.audioElement.volume = 0;
      this.audioElement.preload = 'auto';
      
      this.audioElement.addEventListener('canplaythrough', () => {
        this.audioReady = true;
      }, { once: true });
      
      // Fallback: mark ready after a timeout
      setTimeout(() => { this.audioReady = true; }, 3000);
    } catch {
      // Audio not supported — silently degrade
      this.audioElement = null;
    }
  }
  
  private startAudioIfNeeded(): void {
    if (!this.audioElement || !this.audioReady || this.audioStarted) return;
    
    // Browsers require user interaction before playing audio.
    // Since this is called from a tick which only fires after the user starts typing,
    // the user interaction requirement is satisfied.
    const playPromise = this.audioElement.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked — try again on next interaction
        this.audioStarted = false;
      });
    }
    this.audioStarted = true;
  }
  
  private fadeAudioTo(targetVol: number): void {
    this.targetVolume = targetVol;
    
    if (this.volumeAnimationId !== null) {
      cancelAnimationFrame(this.volumeAnimationId);
    }
    
    if (!this.audioElement) return;
    
    const step = () => {
      if (!this.audioElement) return;
      
      const diff = this.targetVolume - this.audioElement.volume;
      
      if (Math.abs(diff) < 0.005) {
        this.audioElement.volume = this.targetVolume;
        
        // Pause audio when fully muted to save resources
        if (this.targetVolume === 0 && this.audioStarted) {
          this.audioElement.pause();
          this.audioStarted = false;
        }
        return;
      }
      
      // Smooth ramp (~60fps)
      this.audioElement.volume = this.audioElement.volume + diff * 0.08;
      this.volumeAnimationId = requestAnimationFrame(step);
    };
    
    this.volumeAnimationId = requestAnimationFrame(step);
  }
  
  private applyLevel(level: number): void {
    if (level === this.currentLevel) return;
    
    const prevLevel = this.currentLevel;
    this.currentLevel = level;
    
    // Update container class
    if (this.container) {
      this.container.classList.remove(`fire-level-${prevLevel}`);
      this.container.classList.add(`fire-level-${level}`);
    }
    
    // Update particle spawner
    this.stopSpawner();
    
    if (level > 0 && !this.prefersReducedMotion) {
      const config = LEVEL_CONFIGS[level];
      this.spawnIntervalId = window.setInterval(() => {
        this.spawnBurst(config);
      }, config.spawnIntervalMs);
    }
    
    // Update audio
    if (level > 0) {
      this.startAudioIfNeeded();
      this.fadeAudioTo(LEVEL_CONFIGS[level].audioVolume);
    } else {
      this.fadeAudioTo(0);
    }
  }
  
  private stopSpawner(): void {
    if (this.spawnIntervalId !== null) {
      window.clearInterval(this.spawnIntervalId);
      this.spawnIntervalId = null;
    }
  }
  
  private spawnBurst(config: LevelConfig): void {
    if (!this.container) return;
    
    for (let i = 0; i < config.particleCount; i++) {
      this.spawnParticle(config);
    }
  }
  
  private spawnParticle(config: LevelConfig): void {
    if (!this.container) return;
    
    const particle = document.createElement('div');
    
    // Random color
    const colorIdx = Math.floor(Math.random() * PARTICLE_COLORS.length);
    const color = PARTICLE_COLORS[colorIdx];
    particle.className = `fire-particle fire-particle--${color}`;
    
    // Random size
    const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random horizontal position (full width)
    const xPos = Math.random() * 100;
    particle.style.left = `${xPos}%`;
    
    // Random rise height
    const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
    particle.style.setProperty('--fire-height', `-${height}px`);
    particle.style.setProperty('--fire-max-opacity', config.maxOpacity.toString());
    particle.style.setProperty('--fire-duration', `${config.durationMs}ms`);
    
    // Small horizontal sway via random margin
    const sway = (Math.random() - 0.5) * 30;
    particle.style.marginLeft = `${sway}px`;
    
    this.container.appendChild(particle);
    
    // Cleanup after animation ends
    particle.addEventListener('animationend', () => {
      particle.remove();
    }, { once: true });
    
    // Fallback cleanup (in case animationend doesn't fire)
    setTimeout(() => {
      if (particle.parentNode) {
        particle.remove();
      }
    }, config.durationMs + 200);
  }
}
