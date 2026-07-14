import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './AstroStrike.module.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 300; // pixels per second
const LASER_SPEED = 500;
const ENEMY_LASER_SPEED = 300;
const UFO_SPEED = 150;

type Rect = { x: number, y: number, w: number, h: number };
type Entity = Rect & { active: boolean };
type Enemy = Entity & { type: 1 | 2 | 3, row: number, col: number, animFrame: number };
type Laser = Entity & { isEnemy: boolean };

const AABB = (r1: Rect, r2: Rect) => {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
};

const initBunkers = () => {
  const b: Entity[] = [];
  const startXs = [100, 280, 460, 640];
  startXs.forEach(startX => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        if (r >= 2 && (c === 2 || c === 3)) continue; // Hollow middle
        b.push({ x: startX + c * 10, y: 450 + r * 10, w: 10, h: 10, active: true });
      }
    }
  });
  return b;
};

const AstroStrike: React.FC = () => {
  const [uiState, setUiState] = useState({ 
    score: 0, 
    lives: 3, 
    gameOver: false, 
    win: false,
    started: false 
  });
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const gameState = useRef({
    started: false,
    player: { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 40, w: 40, h: 20 },
    keys: { left: false, right: false, space: false },
    enemies: [] as Enemy[],
    lasers: [] as Laser[],
    bunkers: [] as Entity[],
    ufo: { x: -100, y: 50, w: 48, h: 20, active: false, timer: 0, dir: 1 },
    enemyDir: 1,
    enemyMoveTimer: 0,
    enemyStepDelay: 0.8,
    enemyShootTimer: 0,
    score: 0,
    lives: 3,
    gameOver: false,
    win: false,
    xpAwarded: false,
    lastTime: 0
  });

  const syncUI = () => {
    setUiState({
      score: gameState.current.score,
      lives: gameState.current.lives,
      gameOver: gameState.current.gameOver,
      win: gameState.current.win,
      started: gameState.current.started
    });
  };

  const initGame = () => {
    const enemies: Enemy[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 11; col++) {
        const type = row === 0 ? 3 : row < 3 ? 2 : 1;
        enemies.push({
          x: 100 + col * 45,
          y: 100 + row * 40,
          w: 30, h: 24,
          active: true, type, row, col, animFrame: 0
        });
      }
    }

    gameState.current = {
      ...gameState.current,
      started: true,
      player: { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 40, w: 40, h: 20 },
      enemies,
      lasers: [],
      bunkers: initBunkers(),
      ufo: { x: -100, y: 50, w: 48, h: 20, active: false, timer: Math.random() * 10 + 10, dir: 1 },
      enemyDir: 1,
      enemyMoveTimer: 0,
      enemyStepDelay: 0.8,
      enemyShootTimer: 2.0,
      score: 0,
      lives: 3,
      gameOver: false,
      win: false,
      xpAwarded: false,
      lastTime: performance.now()
    };
    syncUI();
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!state.started) return;

    // Draw Player
    if (!state.gameOver) {
      ctx.fillStyle = '#10b981'; // Green ship
      const px = state.player.x;
      const py = state.player.y;
      ctx.fillRect(px, py + 10, 40, 10);
      ctx.fillRect(px + 15, py, 10, 10);
      ctx.fillRect(px + 18, py - 5, 4, 5);
    }

    // Draw Bunkers
    ctx.fillStyle = '#10b981';
    state.bunkers.forEach(b => {
      if (b.active) ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    // Draw Lasers
    state.lasers.forEach(l => {
      ctx.fillStyle = l.isEnemy ? '#ef4444' : '#fbbf24';
      ctx.fillRect(l.x, l.y, l.w, l.h);
    });

    // Draw Enemies
    state.enemies.forEach(e => {
      ctx.fillStyle = e.type === 3 ? '#a855f7' : e.type === 2 ? '#3b82f6' : '#22d3ee';
      // Simple alien shape
      ctx.fillRect(e.x, e.y, e.w, e.h);
      
      // Eyes (animate based on animFrame)
      ctx.fillStyle = '#020617';
      const eyeOffset = e.animFrame === 1 ? 2 : 0;
      ctx.fillRect(e.x + 6 - eyeOffset, e.y + 6, 4, 4);
      ctx.fillRect(e.x + 20 + eyeOffset, e.y + 6, 4, 4);
      
      // Cutouts
      ctx.fillRect(e.x + 12, e.y + 18, 6, 6);
    });

    // Draw UFO
    if (state.ufo.active) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(state.ufo.x + 24, state.ufo.y + 10, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(state.ufo.x + 24, state.ufo.y + 5, 10, Math.PI, 0);
      ctx.fill();
    }

  }, []);

  const update = useCallback((time: number) => {
    const state = gameState.current;
    if (!state.started || state.gameOver || state.win) return;

    // dt cap to prevent death spiral
    const dt = Math.min((time - state.lastTime) / 1000, 0.1);
    state.lastTime = time;

    // Player movement
    if (state.keys.left) state.player.x -= PLAYER_SPEED * dt;
    if (state.keys.right) state.player.x += PLAYER_SPEED * dt;
    // Clamp to screen bounds
    state.player.x = Math.max(0, Math.min(CANVAS_WIDTH - state.player.w, state.player.x));

    // Player Shooting (max 1 bullet)
    const playerBulletActive = state.lasers.some(l => !l.isEnemy);
    if (state.keys.space && !playerBulletActive) {
      state.lasers.push({
        x: state.player.x + state.player.w / 2 - 2,
        y: state.player.y - 15,
        w: 4, h: 15, active: true, isEnemy: false
      });
      state.keys.space = false; // Require release/re-press for touch/hold
    }

    // Alien Logic
    state.enemyMoveTimer -= dt;
    if (state.enemyMoveTimer <= 0) {
      // Speed scales with remaining enemies (55 max)
      const ratio = state.enemies.length / 55;
      state.enemyStepDelay = Math.max(0.05, ratio * 0.8);
      state.enemyMoveTimer = state.enemyStepDelay;

      // Check bounds
      let edgeHit = false;
      state.enemies.forEach(e => {
        if ((state.enemyDir === 1 && e.x + e.w >= CANVAS_WIDTH - 10) || 
            (state.enemyDir === -1 && e.x <= 10)) {
          edgeHit = true;
        }
      });

      if (edgeHit) {
        state.enemyDir *= -1;
        state.enemies.forEach(e => {
          e.y += 20;
          e.animFrame = e.animFrame === 0 ? 1 : 0;
        });
      } else {
        state.enemies.forEach(e => {
          e.x += state.enemyDir * 15;
          e.animFrame = e.animFrame === 0 ? 1 : 0;
        });
      }

      // Check if aliens reach bottom
      let reachedBottom = false;
      state.enemies.forEach(e => {
        if (e.y + e.h >= state.player.y) reachedBottom = true;
      });

      if (reachedBottom) {
        state.lives = 0;
        state.gameOver = true;
        syncUI();
      }
    }

    // Enemy Shooting
    state.enemyShootTimer -= dt;
    if (state.enemyShootTimer <= 0 && state.enemies.length > 0) {
      state.enemyShootTimer = Math.random() * 1.5 + 0.5;
      // Find bottom-most enemies per column
      const cols = new Map<number, Enemy>();
      state.enemies.forEach(e => {
        if (!cols.has(e.col) || cols.get(e.col)!.y < e.y) {
          cols.set(e.col, e);
        }
      });
      const bottomEnemies = Array.from(cols.values());
      const shooter = bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)];
      
      state.lasers.push({
        x: shooter.x + shooter.w / 2 - 2,
        y: shooter.y + shooter.h,
        w: 4, h: 10, active: true, isEnemy: true
      });
    }

    // UFO Logic
    if (state.ufo.active) {
      state.ufo.x += UFO_SPEED * state.ufo.dir * dt;
      if (state.ufo.x > CANVAS_WIDTH + 100 || state.ufo.x < -150) {
        state.ufo.active = false;
      }
    } else {
      state.ufo.timer -= dt;
      if (state.ufo.timer <= 0) {
        state.ufo.active = true;
        state.ufo.dir = Math.random() > 0.5 ? 1 : -1;
        state.ufo.x = state.ufo.dir === 1 ? -60 : CANVAS_WIDTH + 60;
        state.ufo.timer = Math.random() * 15 + 15;
      }
    }

    // Move Lasers
    state.lasers.forEach(l => {
      l.y += l.isEnemy ? ENEMY_LASER_SPEED * dt : -LASER_SPEED * dt;
      if (l.y < -20 || l.y > CANVAS_HEIGHT + 20) l.active = false;
    });

    // Collisions
    for (let i = state.lasers.length - 1; i >= 0; i--) {
      const l = state.lasers[i];
      if (!l.active) continue;

      // Bunker Collision
      let bunkerHit = false;
      for (let j = state.bunkers.length - 1; j >= 0; j--) {
        const b = state.bunkers[j];
        if (b.active && AABB(l, b)) {
          b.active = false;
          l.active = false;
          bunkerHit = true;
          break;
        }
      }
      if (bunkerHit) continue;

      if (!l.isEnemy) {
        // Player Laser -> Enemy
        let enemyHit = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (AABB(l, e)) {
            const pts = e.type === 3 ? 30 : e.type === 2 ? 20 : 10;
            state.score += pts;
            state.enemies.splice(j, 1);
            l.active = false;
            enemyHit = true;
            syncUI();
            break; // Laser destroyed, break enemy loop
          }
        }

        // Player Laser -> UFO
        if (!enemyHit && state.ufo.active && AABB(l, state.ufo)) {
          state.score += (Math.floor(Math.random() * 3) + 1) * 50; // 50, 100, or 150
          state.ufo.active = false;
          l.active = false;
          syncUI();
        }

      } else {
        // Enemy Laser -> Player
        if (AABB(l, state.player)) {
          state.lives--;
          l.active = false;
          syncUI();
          if (state.lives <= 0) {
            state.gameOver = true;
          }
        }
      }
    }

    // Cleanup inactive arrays
    state.lasers = state.lasers.filter(l => l.active);
    state.bunkers = state.bunkers.filter(b => b.active);

    // Win check
    if (state.enemies.length === 0) {
      state.win = true;
      syncUI();
    }

    // Resolve XP
    if ((state.win || state.gameOver) && !state.xpAwarded) {
      state.xpAwarded = true;
      addXp(state.win ? 100 : Math.floor(state.score / 10));
    }

  }, [addXp]);

  const loop = useCallback((time: number) => {
    update(time);
    if (canvasRef.current && gameState.current.started) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        draw(ctx);
      }
    }

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop, draw]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key === 'a') gameState.current.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') gameState.current.keys.right = true;
    if (e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') gameState.current.keys.space = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') gameState.current.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') gameState.current.keys.right = false;
    if (e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') gameState.current.keys.space = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleControlDown = (dir: 'left' | 'right' | 'space', e: React.PointerEvent) => {
    e.preventDefault(); // Unified pointer events prevent emulated mouse bugs
    if (e.currentTarget) e.currentTarget.releasePointerCapture(e.pointerId);
    gameState.current.keys[dir] = true;
  };

  const handleControlUp = (dir: 'left' | 'right' | 'space', e: React.PointerEvent) => {
    e.preventDefault();
    gameState.current.keys[dir] = false;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Astro-Strike</h2>
          <div className={styles.stats}>
            <div className={styles.scoreBoard}>Score: {uiState.score}</div>
            <div className={styles.scoreBoard}>Lives: {uiState.lives}</div>
          </div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%', aspectRatio: '4/3' }}
            className={styles.canvas}
          />
          
          {!uiState.started && (
            <div className={styles.overlay}>
              <h2>READY TO DEFEND?</h2>
              <p>Move and shoot to stop the invasion!</p>
              <button onClick={initGame} className={styles.actionBtn}>Start Game</button>
            </div>
          )}

          {(uiState.gameOver || uiState.win) && (
            <div className={styles.overlay}>
              <h2 style={{ color: uiState.win ? '#10b981' : '#ef4444' }}>
                {uiState.win ? 'INVASION HALTED!' : 'EARTH HAS FALLEN!'}
              </h2>
              <p>Final Score: {uiState.score}</p>
              <p>XP Earned: {uiState.win ? '+100' : `+${Math.floor(uiState.score / 10)}`}</p>
              <button onClick={initGame} className={styles.actionBtn}>Play Again</button>
            </div>
          )}
        </div>
        
        <div className={styles.mobileControls}>
          <div className={styles.dpad}>
            <button 
              className={styles.controlBtn} 
              onPointerDown={(e) => handleControlDown('left', e)} 
              onPointerUp={(e) => handleControlUp('left', e)}
              onPointerLeave={(e) => handleControlUp('left', e)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button 
              className={styles.controlBtn} 
              onPointerDown={(e) => handleControlDown('right', e)} 
              onPointerUp={(e) => handleControlUp('right', e)}
              onPointerLeave={(e) => handleControlUp('right', e)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <button 
            className={`${styles.controlBtn} ${styles.fireBtn}`}
            onPointerDown={(e) => handleControlDown('space', e)} 
            onPointerUp={(e) => handleControlUp('space', e)}
            onPointerLeave={(e) => handleControlUp('space', e)}
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AstroStrike;
