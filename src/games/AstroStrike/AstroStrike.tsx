import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './AstroStrike.module.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 5;
const LASER_SPEED = 8;
const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_SIZE = 30;

type Rect = { x: number, y: number, w: number, h: number };
type Enemy = Rect & { active: boolean };

const AstroStrike: React.FC = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    player: { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 40, w: 40, h: 20 },
    lasers: [] as Rect[],
    enemies: [] as Enemy[],
    enemyDir: 1, // 1 for right, -1 for left
    enemySpeed: 1,
    keys: { left: false, right: false, space: false },
    lastShot: 0
  });

  const initEnemies = () => {
    const enemies: Enemy[] = [];
    for (let r = 0; r < ENEMY_ROWS; r++) {
      for (let c = 0; c < ENEMY_COLS; c++) {
        enemies.push({
          x: c * (ENEMY_SIZE + 20) + 50,
          y: r * (ENEMY_SIZE + 20) + 50,
          w: ENEMY_SIZE,
          h: ENEMY_SIZE,
          active: true
        });
      }
    }
    gameState.current.enemies = enemies;
  };

  const update = useCallback(() => {
    if (gameOver || win) return;
    const state = gameState.current;
    const now = Date.now();
    
    // Player movement
    if (state.keys.left && state.player.x > 0) state.player.x -= PLAYER_SPEED;
    if (state.keys.right && state.player.x < CANVAS_WIDTH - state.player.w) state.player.x += PLAYER_SPEED;

    // Shooting
    if (state.keys.space && now - state.lastShot > 300) {
      state.lasers.push({ x: state.player.x + state.player.w / 2 - 2, y: state.player.y, w: 4, h: 15 });
      state.lastShot = now;
    }

    // Move lasers
    state.lasers.forEach(l => l.y -= LASER_SPEED);
    state.lasers = state.lasers.filter(l => l.y > 0); // remove off-screen

    // Move enemies
    let edgeHit = false;
    const activeEnemies = state.enemies.filter(e => e.active);
    
    if (activeEnemies.length === 0) {
      setWin(true);
      addXp(50);
      return;
    }

    activeEnemies.forEach(e => {
      e.x += state.enemySpeed * state.enemyDir;
      if (e.x <= 0 || e.x + e.w >= CANVAS_WIDTH) edgeHit = true;
    });

    if (edgeHit) {
      state.enemyDir *= -1;
      activeEnemies.forEach(e => e.y += 20); // move down
      state.enemySpeed += 0.2; // speed up
    }

    // Check game over
    if (activeEnemies.some(e => e.y + e.h >= state.player.y)) {
      setGameOver(true);
      addXp(Math.floor(activeEnemies.length > 0 ? (ENEMY_ROWS * ENEMY_COLS - activeEnemies.length) : 0));
      return;
    }

    // Collisions
    state.lasers.forEach((l, lIdx) => {
      state.enemies.forEach(e => {
        if (e.active && l.x < e.x + e.w && l.x + l.w > e.x && l.y < e.y + e.h && l.y + l.h > e.y) {
          e.active = false;
          state.lasers.splice(lIdx, 1);
          setScore(s => s + 10);
        }
      });
    });

  }, [gameOver, win, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Player (Neon Cyan)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
    // Player gun tip
    ctx.fillRect(state.player.x + 15, state.player.y - 10, 10, 10);

    // Lasers (Yellow)
    ctx.shadowColor = '#facc15';
    ctx.fillStyle = '#fef08a';
    state.lasers.forEach(l => {
      ctx.fillRect(l.x, l.y, l.w, l.h);
    });

    // Enemies (Magenta)
    ctx.shadowColor = '#ec4899';
    ctx.fillStyle = '#f472b6';
    state.enemies.forEach(e => {
      if (e.active) {
        ctx.fillRect(e.x, e.y, e.w, e.h);
        // Alien eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 5, e.y + 5, 5, 5);
        ctx.fillRect(e.x + 20, e.y + 5, 5, 5);
        ctx.fillStyle = '#f472b6'; // reset
      }
    });

    ctx.shadowBlur = 0;
  }, []);

  const loop = useCallback(() => {
    if (!gameOver && !win) {
      update();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw, gameOver, win]);

  useEffect(() => {
    initEnemies();
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = true;
      if (e.key === ' ') state.keys.space = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
      if (e.key === ' ') state.keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const restart = () => {
    initEnemies();
    gameState.current.player.x = CANVAS_WIDTH / 2 - 20;
    gameState.current.lasers = [];
    gameState.current.enemyDir = 1;
    gameState.current.enemySpeed = 1;
    setScore(0);
    setGameOver(false);
    setWin(false);
  };

  // Mobile Touch Controls
  const handleTouchStart = (action: 'LEFT' | 'RIGHT' | 'FIRE') => {
    if (action === 'LEFT') gameState.current.keys.left = true;
    if (action === 'RIGHT') gameState.current.keys.right = true;
    if (action === 'FIRE') gameState.current.keys.space = true;
  };

  const handleTouchEnd = (action: 'LEFT' | 'RIGHT' | 'FIRE') => {
    if (action === 'LEFT') gameState.current.keys.left = false;
    if (action === 'RIGHT') gameState.current.keys.right = false;
    if (action === 'FIRE') gameState.current.keys.space = false;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Astro-Strike</h2>
          <div className={styles.scoreBoard}>Score: {score}</div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
        </div>

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'GALAXY SAVED!' : 'INVASION SUCCESSFUL'}
            </h2>
            <p>Score: {score}</p>
            <p>XP Earned: {win ? '+50' : `+${Math.floor(score / 10)}`}</p>
            <button onClick={restart} className={styles.restartBtn}>Play Again</button>
          </div>
        )}

        <div className={styles.mobileControls}>
          <button 
            className={styles.controlBtn} 
            onTouchStart={() => handleTouchStart('LEFT')} 
            onTouchEnd={() => handleTouchEnd('LEFT')}
            onMouseDown={() => handleTouchStart('LEFT')} 
            onMouseUp={() => handleTouchEnd('LEFT')}
          >
            ←
          </button>
          <button 
            className={`${styles.controlBtn} ${styles.fireBtn}`}
            onTouchStart={() => handleTouchStart('FIRE')} 
            onTouchEnd={() => handleTouchEnd('FIRE')}
            onMouseDown={() => handleTouchStart('FIRE')} 
            onMouseUp={() => handleTouchEnd('FIRE')}
          >
            FIRE
          </button>
          <button 
            className={styles.controlBtn} 
            onTouchStart={() => handleTouchStart('RIGHT')} 
            onTouchEnd={() => handleTouchEnd('RIGHT')}
            onMouseDown={() => handleTouchStart('RIGHT')} 
            onMouseUp={() => handleTouchEnd('RIGHT')}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AstroStrike;
