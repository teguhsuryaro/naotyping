import { LiveTick } from '../engine/scoring.ts';
import './creature.css';

export interface CreatureAnimation {
  mount(container: HTMLElement): void;
  setStage(stage: 0 | 1 | 2 | 3 | 4): void;
  reset(): void;
  handleTick(tick: LiveTick): void;
}

const SCORE_REFERENCE_MAX_WPM = 90;

interface Obstacle {
  element: HTMLElement;
  positionPct: number;
  hasJumped: boolean;
}

export class CreatureAnimationImpl implements CreatureAnimation {
  private container: HTMLElement | null = null;
  private particleEmitter: HTMLElement | null = null;
  private creatureWrapper: HTMLElement | null = null;
  private creatureSvg: HTMLElement | null = null;
  
  private currentStage: 0 | 1 | 2 | 3 | 4 = 0;
  private lastStageChangeTime: number = 0;
  
  private particleIntervalId: number | null = null;
  
  private characterX: number = 0;
  private obstacles: Obstacle[] = [];
  
  constructor() {
    this.lastStageChangeTime = performance.now();
  }
  
  public mount(container: HTMLElement): void {
    this.container = container;
    this.container.className = 'creature-container stage-0';
    
    // Create Parallax Layers
    const runnerBg = document.createElement('div');
    runnerBg.className = 'runner-bg';
    
    const farLayer = document.createElement('div');
    farLayer.className = 'runner-layer runner-layer-far';
    
    const nearLayer = document.createElement('div');
    nearLayer.className = 'runner-layer runner-layer-near';
    
    runnerBg.appendChild(farLayer);
    runnerBg.appendChild(nearLayer);
    
    // Create Obstacles
    const obstaclePositions = [20, 45, 70, 90];
    obstaclePositions.forEach((pos) => {
      const obs = document.createElement('div');
      obs.className = 'obstacle';
      obs.style.left = `${pos}%`;
      runnerBg.appendChild(obs);
      this.obstacles.push({
        element: obs,
        positionPct: pos,
        hasJumped: false
      });
    });
    
    // Create Particle Emitter
    this.particleEmitter = document.createElement('div');
    this.particleEmitter.className = 'particle-emitter';
    
    // Create Creature Wrapper
    this.creatureWrapper = document.createElement('div');
    this.creatureWrapper.className = 'creature-wrapper';
    
    // SVG mascot
    this.creatureWrapper.innerHTML = `
      <svg class="creature-svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <ellipse class="creature-shadow" cx="60" cy="105" rx="30" ry="6" fill="rgba(0,0,0,0.12)"/>
        
        <!-- Far Leg -->
        <g class="creature-leg leg-left">
          <ellipse cx="48" cy="101" rx="8" ry="5" fill="var(--accent-purple)"/>
        </g>
        
        <!-- Near Leg -->
        <g class="creature-leg leg-right">
          <ellipse cx="72" cy="101" rx="8" ry="5" fill="var(--accent-primary)"/>
        </g>
        
        <!-- Body -->
        <g class="creature-body">
          <!-- Blob body shape -->
          <rect x="35" y="35" width="50" height="65" rx="25" fill="var(--accent-pink)"/>
          <!-- Belly -->
          <rect x="42" y="58" width="36" height="34" rx="17" fill="rgba(255, 255, 255, 0.35)"/>
          
          <!-- Face -->
          <g class="creature-face">
            <circle class="creature-eye eye-left" cx="52" cy="53" r="4.5" fill="var(--text-heading)"/>
            <circle class="creature-eye eye-right" cx="68" cy="53" r="4.5" fill="var(--text-heading)"/>
            <circle cx="46" cy="59" r="3" fill="var(--accent-coral)" opacity="0.6"/>
            <circle cx="74" cy="59" r="3" fill="var(--accent-coral)" opacity="0.6"/>
            <path class="creature-mouth" d="M58,60 Q60,62 62,60" stroke="var(--text-heading)" stroke-width="1.8" stroke-linecap="round" fill="none"/>
          </g>
        </g>
      </svg>
    `;
    
    this.creatureSvg = this.creatureWrapper.querySelector('.creature-svg') as HTMLElement;
    
    // Handle jump animation end to remove class
    this.creatureSvg.addEventListener('animationend', (e) => {
      if (e.animationName === 'jump-arc') {
        this.creatureSvg?.classList.remove('jumping');
      }
    });
    
    this.container.appendChild(runnerBg);
    this.container.appendChild(this.particleEmitter);
    this.container.appendChild(this.creatureWrapper);
    
    this.setStage(0);
    this.updatePosition(0);
  }
  
  public handleTick(tick: LiveTick): void {
    let targetStage: 0 | 1 | 2 | 3 | 4 = 0;
    
    if (tick.timeLeftSec > 0 && tick.rollingWpm > 0) {
      const wpm = tick.rollingWpm;
      if (wpm < 20) {
        targetStage = 1;
      } else if (wpm < 40) {
        targetStage = 2;
      } else if (wpm < 65) {
        targetStage = 3;
      } else {
        targetStage = 4;
      }
      
      this.updatePosition(wpm);
    } else {
      targetStage = 0;
      if (tick.timeLeftSec === 60) {
        this.updatePosition(0);
      }
    }
    
    if (targetStage !== this.currentStage) {
      const now = performance.now();
      const elapsedSinceChange = now - this.lastStageChangeTime;
      
      // Enforce 800ms minimum hold-time to prevent visual flickering
      if (elapsedSinceChange >= 800) {
        this.setStage(targetStage);
      }
    }
  }
  
  private updatePosition(wpm: number) {
    if (!this.container || !this.creatureWrapper) return;
    
    const progress = Math.min(Math.max(wpm / SCORE_REFERENCE_MAX_WPM, 0), 1);
    const trackWidth = this.container.clientWidth;
    const characterWidth = 120;
    this.characterX = progress * (trackWidth - characterWidth);
    
    let scaleStr = '';
    if (this.currentStage === 4) {
      scaleStr = ' scale(1.08)';
    }
    this.creatureWrapper.style.transform = `translateX(${this.characterX}px)${scaleStr}`;
    
    // Check obstacles
    const progressPct = progress * 100;
    const tolerance = 2; // % tolerance for resetting
    
    this.obstacles.forEach(obs => {
      if (progressPct >= obs.positionPct && !obs.hasJumped) {
        // Trigger jump
        obs.hasJumped = true;
        this.creatureSvg?.classList.remove('jumping');
        // Force reflow
        void this.creatureSvg?.offsetWidth;
        this.creatureSvg?.classList.add('jumping');
      } else if (progressPct < obs.positionPct - tolerance && obs.hasJumped) {
        // Reset jump if moved backward enough
        obs.hasJumped = false;
      }
    });
  }
  
  public setStage(stage: 0 | 1 | 2 | 3 | 4): void {
    this.currentStage = stage;
    this.lastStageChangeTime = performance.now();
    
    if (this.container) {
      // Remove previous stage classes
      for (let i = 0; i <= 4; i++) {
        this.container.classList.remove(`stage-${i}`);
      }
      this.container.classList.add(`stage-${stage}`);
    }
    
    // Maintain scale for stage 4
    if (this.creatureWrapper) {
      let scaleStr = this.currentStage === 4 ? ' scale(1.08)' : '';
      this.creatureWrapper.style.transform = `translateX(${this.characterX}px)${scaleStr}`;
    }
    
    this.adjustParticlesEmitter();
  }
  
  public reset(): void {
    this.setStage(0);
    this.updatePosition(0);
    this.obstacles.forEach(obs => obs.hasJumped = false);
    if (this.particleEmitter) {
      this.particleEmitter.innerHTML = '';
    }
  }
  
  private adjustParticlesEmitter(): void {
    if (this.particleIntervalId !== null) {
      window.clearInterval(this.particleIntervalId);
      this.particleIntervalId = null;
    }
    
    // Only spawn particles on Stage 3 and Stage 4
    if (this.currentStage === 3 || this.currentStage === 4) {
      const spawnInterval = this.currentStage === 4 ? 150 : 350;
      this.particleIntervalId = window.setInterval(() => {
        this.spawnParticle();
      }, spawnInterval);
    }
  }
  
  private spawnParticle(): void {
    if (!this.particleEmitter || !this.creatureWrapper) return;
    
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Pick random pastel accent color
    const colors = [
      'var(--accent-mint)',
      'var(--accent-purple)',
      'var(--accent-yellow)',
      'var(--accent-pink)',
      'var(--accent-coral)'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.background = color;
    
    // Randomize dimensions (4px to 10px)
    const size = Math.floor(Math.random() * 6) + 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Apply initial position aligned with creature current X position
    // We add ~60px to offset from left edge of character
    const baseX = this.characterX + 60; 
    
    // Randomize vertical offsets slightly to make the trail natural
    const yOffset = Math.floor(Math.random() * 20) - 10; // -10px to +10px
    particle.style.marginTop = `${yOffset}px`;
    
    this.particleEmitter.appendChild(particle);
    
    // Override particle transform to spawn at baseX instead of fixed 60px
    // CSS keyframes override inline style if they animate same property,
    // so we need to inject dynamic start pos. Alternatively, wrap particle in a div.
    // Easier: set style.left = baseX + 'px' and let keyframe animate transform relative to it.
    particle.style.left = `${baseX}px`;
    
    // Clean up particle after animation finishes (1.2s)
    setTimeout(() => {
      particle.remove();
    }, 1200);
  }
}

