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
type PlatformType = 'normal' | 'moving' | 'breaking';
type Platform = Rect & { type: PlatformType, vx?: number, broken?: boolean };

const SpringNinja: React.FC = () => {
  const [displayScore, setDisplayScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  
  const gameState = useRef({
    player: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT / 2, w: 30, h: 30, vy: 0 } as Player,
    platforms: [] as Platform[],
    keys: { left: false, right: false },
    scrollOffset: 0,
    score: 0,
    isGameOver: false
  });

  const generatePlatforms = (startY: number, amount: number, currentOffset: number) => {
    const plats: Platform[] = [];
    let currentY = startY;
    for (let i = 0; i < amount; i++) {
      const difficultyBonus = Math.min(100, (currentOffset / 20000) * 100);
      const gap = Math.random() * 50 + 50 + difficultyBonus;
      
      let type: PlatformType = 'normal';
      let vx = 0;
      if (Math.random() < 0.15 + (difficultyBonus / 200)) {
        type = 'moving';
        vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2);
      } else if (Math.random() < 0.1) {
        type = 'breaking';
      }

      plats.push({
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y: currentY,
        w: PLATFORM_WIDTH,
        h: PLATFORM_HEIGHT,
        type,
        vx,
        broken: false
      });
      currentY -= gap;
    }
    return plats;
  };

  const initGame = useCallback(() => {
    const initialPlatforms: Platform[] = [
      { x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2, y: CANVAS_HEIGHT - 50, w: PLATFORM_WIDTH, h: PLATFORM_HEIGHT, type: 'normal' },
      ...generatePlatforms(CANVAS_HEIGHT - 150, 10, 0)
    ];

    gameState.current = {
      player: { x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT / 2, w: 30, h: 30, vy: 0 },
      platforms: initialPlatforms,
      keys: { left: false, right: false },
      scrollOffset: 0,
      score: 0,
      isGameOver: false
    };
    setDisplayScore(0);
    setGameOver(false);
    lastTimeRef.current = performance.now();
  }, []);

  const update = useCallback((dt: number) => {
    const state = gameState.current;
    if (state.isGameOver) return;

    // Movement
    if (state.keys.left) state.player.x -= MOVE_SPEED * dt;
    if (state.keys.right) state.player.x += MOVE_SPEED * dt;

    // Wrap horizontally
    if (state.player.x < -state.player.w) state.player.x = CANVAS_WIDTH;
    if (state.player.x > CANVAS_WIDTH) state.player.x = -state.player.w;

    // Physics
    state.player.vy += GRAVITY * dt;
    state.player.y += state.player.vy * dt;

    // Update moving platforms
    state.platforms.forEach(p => {
      if (p.type === 'moving' && p.vx !== undefined) {
        p.x += p.vx * dt;
        if (p.x < 0 || p.x + p.w > CANVAS_WIDTH) {
          p.vx = -p.vx;
        }
      }
    });

    // Collision (only when falling)
    if (state.player.vy > 0) {
      state.platforms.forEach(p => {
        if (!p.broken &&
          state.player.x < p.x + p.w &&
          state.player.x + state.player.w > p.x &&
          state.player.y + state.player.h > p.y &&
          state.player.y - (state.player.vy * dt) + state.player.h <= p.y
        ) {
          if (p.type === 'breaking') {
            p.broken = true;
          } else {
            state.player.vy = JUMP_FORCE;
            state.player.y = p.y - state.player.h; // snap to top
          }
        }
      });
    }

    // Scroll map if player goes above middle
    if (state.player.y < CANVAS_HEIGHT / 2) {
      const diff = CANVAS_HEIGHT / 2 - state.player.y;
      state.player.y = CANVAS_HEIGHT / 2;
      state.platforms.forEach(p => p.y += diff);
      
      state.scrollOffset += diff;
      state.score = state.scrollOffset / 10;
    }

    // Generate new platforms and remove old
    if (state.platforms[state.platforms.length - 1].y > 0) {
      const topY = state.platforms[state.platforms.length - 1].y;
      state.platforms = [
        ...state.platforms,
        ...generatePlatforms(topY - 100, 5, state.scrollOffset)
      ];
    }

    state.platforms = state.platforms.filter(p => p.y < CANVAS_HEIGHT);

    // Fall off bottom -> Game Over
    if (state.player.y > CANVAS_HEIGHT) {
      if (!state.isGameOver) {
        state.isGameOver = true;
        setGameOver(true);
        setDisplayScore(Math.floor(state.score));
        addXp(Math.floor(state.score / 50));
      }
    }

  }, [addXp]);

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

    // Draw Platforms
    state.platforms.forEach(p => {
      if (!p.broken) {
        if (p.type === 'moving') ctx.fillStyle = '#3b82f6'; // Blue
        else if (p.type === 'breaking') ctx.fillStyle = '#b45309'; // Brown
        else ctx.fillStyle = '#a855f7'; // Neon Purple

        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    });
    ctx.shadowBlur = 0;

    // Draw Player (Neon Pink)
    ctx.fillStyle = '#f472b6';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ec4899';
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
    ctx.shadowBlur = 0;

  }, []);

  const loop = useCallback((timestamp: number) => {
    const rawDt = (timestamp - lastTimeRef.current) / 16.666;
    const dt = Math.min(rawDt, 2.0); // Clamp dt to prevent tunneling
    lastTimeRef.current = timestamp;

    if (!gameState.current.isGameOver) {
      update(dt);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
    initGame();
  }, [initGame]);

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

  // Sync score periodically to avoid 60fps renders
  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameState.current.isGameOver) {
        setDisplayScore(Math.floor(gameState.current.score));
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = (dir: 'LEFT' | 'RIGHT') => {
    if (dir === 'LEFT') gameState.current.keys.left = true;
    if (dir === 'RIGHT') gameState.current.keys.right = true;
  };

  const handlePointerUp = (dir: 'LEFT' | 'RIGHT') => {
    if (dir === 'LEFT') gameState.current.keys.left = false;
    if (dir === 'RIGHT') gameState.current.keys.right = false;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Spring-Ninja</h2>
          <div className={styles.scoreBoard}>Height: {displayScore}m</div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%', aspectRatio: '4/3' }}
            className={styles.canvas}
          />
          {/* Mobile Touch Overlay */}
          <div className={styles.touchOverlay}>
            <div 
              className={styles.touchLeft} 
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown('LEFT'); }} 
              onPointerUp={(e) => { e.preventDefault(); handlePointerUp('LEFT'); }}
              onPointerOut={(e) => { e.preventDefault(); handlePointerUp('LEFT'); }}
              onContextMenu={(e) => e.preventDefault()}
            />
            <div 
              className={styles.touchRight} 
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown('RIGHT'); }} 
              onPointerUp={(e) => { e.preventDefault(); handlePointerUp('RIGHT'); }}
              onPointerOut={(e) => { e.preventDefault(); handlePointerUp('RIGHT'); }}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>PLUMMETED!</h2>
            <p>Height Reached: {displayScore}m</p>
            <p>XP Earned: +{Math.floor(displayScore / 50)}</p>
            <button onClick={initGame} className={styles.restartBtn}>Jump Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpringNinja;
