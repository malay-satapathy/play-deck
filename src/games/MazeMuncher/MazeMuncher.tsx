import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './MazeMuncher.module.css';

// 0: path+dot, 1: wall, 2: empty path, 3: power pellet
const INITIAL_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,0,0,1,0,0,0,0,0,3,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,1,1,1,0,1,2,2,2,1,0,1,1,1,1],
  [2,2,2,2,0,1,2,2,2,1,0,2,2,2,2],
  [1,1,1,1,0,1,1,1,1,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,3,1,1,0,1,0,1,0,1,0,1,1,3,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const CELL_SIZE = 30;
const ROWS = INITIAL_MAZE.length;
const COLS = INITIAL_MAZE[0].length;
const CANVAS_WIDTH = COLS * CELL_SIZE;
const CANVAS_HEIGHT = ROWS * CELL_SIZE;
const SPEED = 2;

type Dir = { x: number, y: number };
const DIRS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  NONE: { x: 0, y: 0 }
};

type Entity = { x: number, y: number, dir: Dir, nextDir: Dir, type?: string, frightenedTime?: number, startX?: number, startY?: number };

const MazeMuncher: React.FC = () => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    maze: [] as number[][],
    dotsCount: 0,
    player: { x: 7 * CELL_SIZE, y: 11 * CELL_SIZE, dir: DIRS.NONE, nextDir: DIRS.NONE } as Entity,
    ghosts: [] as Entity[]
  });

  const initGame = () => {
    const maze = INITIAL_MAZE.map(row => [...row]);
    let dots = 0;
    maze.forEach(row => row.forEach(c => { if (c === 0 || c === 3) dots++; }));
    
    gameState.current = {
      maze,
      dotsCount: dots,
      player: { x: 7 * CELL_SIZE, y: 11 * CELL_SIZE, dir: DIRS.NONE, nextDir: DIRS.NONE },
      ghosts: [
        { x: 6 * CELL_SIZE, y: 7 * CELL_SIZE, dir: DIRS.RIGHT, nextDir: DIRS.RIGHT, type: 'red', frightenedTime: 0, startX: 6 * CELL_SIZE, startY: 7 * CELL_SIZE },
        { x: 7 * CELL_SIZE, y: 7 * CELL_SIZE, dir: DIRS.UP, nextDir: DIRS.UP, type: 'pink', frightenedTime: 0, startX: 7 * CELL_SIZE, startY: 7 * CELL_SIZE },
        { x: 8 * CELL_SIZE, y: 7 * CELL_SIZE, dir: DIRS.LEFT, nextDir: DIRS.LEFT, type: 'cyan', frightenedTime: 0, startX: 8 * CELL_SIZE, startY: 7 * CELL_SIZE },
      ]
    };
    setScore(0);
    setGameOver(false);
    setWin(false);
  };

  const isWalkable = (cx: number, cy: number) => {
    if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS) return false;
    return gameState.current.maze[cy][cx] !== 1;
  };

  const moveEntity = (ent: Entity, speed: number, isPlayer: boolean) => {
    // Attempt turn if centered
    if (ent.x % CELL_SIZE === 0 && ent.y % CELL_SIZE === 0) {
      const cx = ent.x / CELL_SIZE;
      const cy = ent.y / CELL_SIZE;
      
      // If player wants to turn, check if valid
      if (ent.nextDir !== ent.dir && isWalkable(cx + ent.nextDir.x, cy + ent.nextDir.y)) {
        ent.dir = ent.nextDir;
      }
      
      // If AI, randomly pick a valid direction
      if (!isPlayer) {
        const possible = [DIRS.UP, DIRS.DOWN, DIRS.LEFT, DIRS.RIGHT].filter(d => 
          !(d.x === -ent.dir.x && d.y === -ent.dir.y) && // Don't reverse immediately
          isWalkable(cx + d.x, cy + d.y)
        );
        if (possible.length > 0) {
          ent.dir = possible[Math.floor(Math.random() * possible.length)];
        } else {
          ent.dir = { x: -ent.dir.x, y: -ent.dir.y }; // Reverse if stuck
        }
      }

      // Check wall ahead
      if (!isWalkable(cx + ent.dir.x, cy + ent.dir.y)) {
        ent.dir = DIRS.NONE;
      }
    }

    ent.x += ent.dir.x * speed;
    ent.y += ent.dir.y * speed;

    // Tunnel wrap (row 7)
    if (ent.y === 7 * CELL_SIZE) {
      if (ent.x < 0) ent.x = CANVAS_WIDTH - speed;
      if (ent.x >= CANVAS_WIDTH) ent.x = 0;
    }
  };

  const update = useCallback(() => {
    if (gameOver || win) return;
    const state = gameState.current;

    moveEntity(state.player, SPEED, true);
    state.ghosts.forEach(g => {
      if (g.frightenedTime && g.frightenedTime > 0) {
        g.frightenedTime--;
        moveEntity(g, SPEED - 1, false);
      } else {
        moveEntity(g, SPEED - 0.5, false);
      }
    });

    // Eat dot or power pellet
    if (state.player.x % CELL_SIZE === 0 && state.player.y % CELL_SIZE === 0) {
      const cx = state.player.x / CELL_SIZE;
      const cy = state.player.y / CELL_SIZE;
      if (cx >= 0 && cx < COLS && (state.maze[cy][cx] === 0 || state.maze[cy][cx] === 3)) {
        const isPower = state.maze[cy][cx] === 3;
        state.maze[cy][cx] = 2; // clear
        state.dotsCount--;
        setScore(s => s + (isPower ? 50 : 10));
        
        if (isPower) {
          state.ghosts.forEach(g => g.frightenedTime = 600); // ~10s at 60fps
        }
        
        if (state.dotsCount === 0) {
          setWin(true);
          addXp(100);
          return;
        }
      }
    }

    // Ghost collision
    for (let g of state.ghosts) {
      const dist = Math.abs(g.x - state.player.x) + Math.abs(g.y - state.player.y);
      if (dist < CELL_SIZE - 5) {
        if (g.frightenedTime && g.frightenedTime > 0) {
          g.x = g.startX!;
          g.y = g.startY!;
          g.frightenedTime = 0;
          setScore(s => s + 200);
        } else {
          setGameOver(true);
          addXp(Math.floor(score / 5));
          return;
        }
      }
    }
  }, [gameOver, win, score, addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (state.maze[r][c] === 1) {
          ctx.fillStyle = '#1e3a8a'; // Wall color
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#3b82f6';
          ctx.strokeRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        } else if (state.maze[r][c] === 0) {
          ctx.fillStyle = '#fef08a'; // Dot
          ctx.beginPath();
          ctx.arc(c * CELL_SIZE + CELL_SIZE/2, r * CELL_SIZE + CELL_SIZE/2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (state.maze[r][c] === 3) {
          ctx.fillStyle = '#fef08a'; // Power pellet
          ctx.beginPath();
          ctx.arc(c * CELL_SIZE + CELL_SIZE/2, r * CELL_SIZE + CELL_SIZE/2, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Player
    ctx.fillStyle = '#eab308'; // Pacman Yellow
    ctx.beginPath();
    let angle = 0;
    if (state.player.dir === DIRS.RIGHT) angle = 0;
    else if (state.player.dir === DIRS.DOWN) angle = 0.5 * Math.PI;
    else if (state.player.dir === DIRS.LEFT) angle = Math.PI;
    else if (state.player.dir === DIRS.UP) angle = 1.5 * Math.PI;
    else if (state.player.nextDir === DIRS.RIGHT) angle = 0; // Fallback
    else if (state.player.nextDir === DIRS.DOWN) angle = 0.5 * Math.PI;
    else if (state.player.nextDir === DIRS.LEFT) angle = Math.PI;
    else if (state.player.nextDir === DIRS.UP) angle = 1.5 * Math.PI;
    
    // Add simple chomping animation using Date.now()
    const chomp = state.player.dir !== DIRS.NONE ? (Math.sin(Date.now() / 80) + 1) * 0.15 : 0.2; 
    
    ctx.arc(
      state.player.x + CELL_SIZE/2, 
      state.player.y + CELL_SIZE/2, 
      CELL_SIZE/2 - 4, 
      angle + chomp * Math.PI, 
      angle + (2 - chomp) * Math.PI
    );
    ctx.lineTo(state.player.x + CELL_SIZE/2, state.player.y + CELL_SIZE/2);
    ctx.fill();

    // Draw Ghosts
    state.ghosts.forEach(g => {
      ctx.fillStyle = (g.frightenedTime && g.frightenedTime > 0) 
        ? '#3b82f6' // Frightened blue
        : (g.type === 'red' ? '#ef4444' : g.type === 'pink' ? '#f472b6' : '#22d3ee');
      ctx.beginPath();
      const gx = g.x + CELL_SIZE/2;
      const gy = g.y + CELL_SIZE/2;
      const r = CELL_SIZE/2 - 4;
      ctx.arc(gx, gy, r, Math.PI, 0);
      ctx.lineTo(gx + r, gy + r);
      ctx.lineTo(gx - r, gy + r);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(gx - 4, gy - 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + 4, gy - 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = (g.frightenedTime && g.frightenedTime > 0) ? 'transparent' : 'blue';
      ctx.beginPath(); ctx.arc(gx - 4 + g.dir.x, gy - 2 + g.dir.y, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + 4 + g.dir.x, gy - 2 + g.dir.y, 1.5, 0, Math.PI*2); ctx.fill();
    });

  }, []);

  const loop = useCallback(() => {
    update();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  useEffect(() => {
    initGame();
  }, []);

  const handleDPad = (dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
    gameState.current.player.nextDir = DIRS[dir];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleDPad('UP');
      if (e.key === 'ArrowDown' || e.key === 's') handleDPad('DOWN');
      if (e.key === 'ArrowLeft' || e.key === 'a') handleDPad('LEFT');
      if (e.key === 'ArrowRight' || e.key === 'd') handleDPad('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Maze-Muncher</h2>
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
            <h2 style={{ color: win ? '#10b981' : '#eab308' }}>
              {win ? 'MAZE CLEARED!' : 'CAUGHT!'}
            </h2>
            <p>Score: {score}</p>
            <p>XP Earned: {win ? '+100' : `+${Math.floor(score / 5)}`}</p>
            <button onClick={initGame} className={styles.restartBtn}>Play Again</button>
          </div>
        )}
        
        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onClick={() => handleDPad('UP')}>↑</button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onClick={() => handleDPad('LEFT')}>←</button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onClick={() => handleDPad('DOWN')}>↓</button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onClick={() => handleDPad('RIGHT')}>→</button>
        </div>
      </div>
    </div>
  );
};

export default MazeMuncher;
