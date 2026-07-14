import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './SpringNinja.module.css';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.4;
const JUMP_FORCE = -10;
const MOVE_SPEED = 5;
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 15;

type Rect = { x: number, y: number, w: number, h: number };
type Player = Rect & { vy: number };

const SpringNinja: React.FC = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    player: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT / 2, w: 30, h: 30, vy: 0 } as Player,
    platforms: [] as Rect[],
    keys: { left: false, right: false },
    scrollOffset: 0
  });

  const generatePlatforms = (startY: number, amount: number) => {
    const plats = [];
    let currentY = startY;
    for (let i = 0; i < amount; i++) {
      plats.push({
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y: currentY,
        w: PLATFORM_WIDTH,
        h: PLATFORM_HEIGHT
      });
      currentY -= Math.random() * 50 + 50; // Random gap 50-100
    }
    return plats;
  };

  const initGame = useCallback(() => {
    // Initial platform right under player
    const initialPlatforms = [
      { x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2, y: CANVAS_HEIGHT - 50, w: PLATFORM_WIDTH, h: PLATFORM_HEIGHT },
      ...generatePlatforms(CANVAS_HEIGHT - 150, 10)
    ];

    gameState.current = {
      player: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT / 2, w: 30, h: 30, vy: 0 },
      platforms: initialPlatforms,
      keys: { left: false, right: false },
      scrollOffset: 0
    };
    setScore(0);
    setGameOver(false);
  }, []);

  const update = useCallback(() => {
    if (gameOver) return;
    const state = gameState.current;

    // Movement
    if (state.keys.left) state.player.x -= MOVE_SPEED;
    if (state.keys.right) state.player.x += MOVE_SPEED;

    // Wrap horizontally
    if (state.player.x < -state.player.w) state.player.x = CANVAS_WIDTH;
    if (state.player.x > CANVAS_WIDTH) state.player.x = -state.player.w;

    // Physics
    state.player.vy += GRAVITY;
    state.player.y += state.player.vy;

    // Collision (only when falling)
    if (state.player.vy > 0) {
      state.platforms.forEach(p => {
        if (
          state.player.x < p.x + p.w &&
          state.player.x + state.player.w > p.x &&
          state.player.y + state.player.h > p.y &&
          state.player.y + state.player.h < p.y + p.h + state.player.vy
        ) {
          state.player.vy = JUMP_FORCE;
          state.player.y = p.y - state.player.h; // snap to top
        }
      });
    }

    // Scroll map if player goes above middle
    if (state.player.y < CANVAS_HEIGHT / 2) {
      const diff = CANVAS_HEIGHT / 2 - state.player.y;
      state.player.y = CANVAS_HEIGHT / 2;
      state.platforms.forEach(p => p.y += diff);
      
      setScore(s => s + Math.floor(diff));
      state.scrollOffset += diff;
    }

    // Generate new platforms and remove old
    if (state.platforms[state.platforms.length - 1].y > 0) {
      const topY = state.platforms[state.platforms.length - 1].y;
      state.platforms = [
        ...state.platforms,
        ...generatePlatforms(topY - 100, 5)
      ];
    }

    state.platforms = state.platforms.filter(p => p.y < CANVAS_HEIGHT);

    // Fall off bottom -> Game Over
    if (state.player.y > CANVAS_HEIGHT) {
      setGameOver(true);
      addXp(Math.floor(score / 50));
    }

  }, [gameOver, score, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Background
    ctx.fillStyle = '#1e1b4b'; // Deep indigo
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid lines for style
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
      const yPos = (i + (state.scrollOffset % 50));
      ctx.beginPath(); ctx.moveTo(0, yPos); ctx.lineTo(CANVAS_WIDTH, yPos); ctx.stroke();
    }

    // Draw Platforms (Neon Purple)
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#a855f7';
    state.platforms.forEach(p => {
      ctx.fillRect(p.x, p.y, p.w, p.h);
    });
    ctx.shadowBlur = 0;

    // Draw Player (Neon Pink)
    ctx.fillStyle = '#f472b6';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899';
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
    ctx.shadowBlur = 0;

  }, []);

  const loop = useCallback(() => {
    if (!gameOver) {
      update();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw, gameOver]);

  useEffect(() => {
    initGame();
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop, initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleTouchStart = (dir: 'LEFT' | 'RIGHT') => {
    if (dir === 'LEFT') gameState.current.keys.left = true;
    if (dir === 'RIGHT') gameState.current.keys.right = true;
  };

  const handleTouchEnd = (dir: 'LEFT' | 'RIGHT') => {
    if (dir === 'LEFT') gameState.current.keys.left = false;
    if (dir === 'RIGHT') gameState.current.keys.right = false;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Spring-Ninja</h2>
          <div className={styles.scoreBoard}>Height: {Math.floor(score / 10)}m</div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className={styles.canvas}
          />
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>PLUMMETED!</h2>
            <p>Height Reached: {Math.floor(score / 10)}m</p>
            <p>XP Earned: +{Math.floor(score / 50)}</p>
            <button onClick={initGame} className={styles.restartBtn}>Jump Again</button>
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
            ← LEFT
          </button>
          <button 
            className={styles.controlBtn} 
            onTouchStart={() => handleTouchStart('RIGHT')} 
            onTouchEnd={() => handleTouchEnd('RIGHT')}
            onMouseDown={() => handleTouchStart('RIGHT')} 
            onMouseUp={() => handleTouchEnd('RIGHT')}
          >
            RIGHT →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpringNinja;
