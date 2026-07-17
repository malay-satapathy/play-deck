import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './MazeMuncher.module.css';

// 0: path+dot, 1: wall, 2: empty path, 3: power pellet, 4: ghost door
const INITIAL_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,0,0,1,0,0,0,0,0,3,1],
  [1,0,1,1,0,1,0,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,1,1,1,0,1,4,4,4,1,0,1,1,1,1],
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

const BASE_SPEED = 120; // pixels per second

type Dir = { x: number, y: number };
const DIRS = {
  UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 },
  NONE: { x: 0, y: 0 }
};

type Entity = { 
  x: number, y: number, 
  dir: Dir, nextDir: Dir, 
  type?: string, 
  state: 'chase' | 'scatter' | 'frightened' | 'eyes' | 'house',
  frightenedTime: number, 
  startX: number, startY: number,
  lastNodeX?: number, lastNodeY?: number
};

const MazeMuncher: React.FC = () => {
  const [uiState, setUiState] = useState({ score: 0, lives: 3, gameOver: false, win: false });
  const { addXp } = useGlobalState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const gameState = useRef({
    maze: [] as number[][],
    dotsCount: 0,
    player: { x: 7 * CELL_SIZE, y: 11 * CELL_SIZE, dir: DIRS.NONE, nextDir: DIRS.NONE } as Entity,
    ghosts: [] as Entity[],
    score: 0,
    lives: 3,
    gameOver: false,
    win: false,
    xpAwarded: false,
    lastTime: 0,
    mode: 'scatter' as 'scatter' | 'chase',
    modeTimer: 0
  });

  const syncUI = () => {
    setUiState({
      score: gameState.current.score,
      lives: gameState.current.lives,
      gameOver: gameState.current.gameOver,
      win: gameState.current.win
    });
  };

  const initGame = () => {
    const maze = INITIAL_MAZE.map(row => [...row]);
    let dots = 0;
    maze.forEach(row => row.forEach(c => { if (c === 0 || c === 3) dots++; }));
    
    gameState.current = {
      ...gameState.current,
      maze,
      dotsCount: dots,
      player: { x: 7 * CELL_SIZE, y: 11 * CELL_SIZE, dir: DIRS.NONE, nextDir: DIRS.NONE, state: 'chase', frightenedTime: 0, startX: 7*CELL_SIZE, startY: 11*CELL_SIZE },
      ghosts: [
        { x: 7 * CELL_SIZE, y: 5 * CELL_SIZE, dir: DIRS.LEFT, nextDir: DIRS.LEFT, type: 'red', state: 'scatter', frightenedTime: 0, startX: 7 * CELL_SIZE, startY: 5 * CELL_SIZE },
        { x: 6 * CELL_SIZE, y: 7 * CELL_SIZE, dir: DIRS.UP, nextDir: DIRS.UP, type: 'pink', state: 'house', frightenedTime: 0, startX: 6 * CELL_SIZE, startY: 7 * CELL_SIZE },
        { x: 7 * CELL_SIZE, y: 7 * CELL_SIZE, dir: DIRS.UP, nextDir: DIRS.UP, type: 'cyan', state: 'house', frightenedTime: 0, startX: 7 * CELL_SIZE, startY: 7 * CELL_SIZE },
        { x: 8 * CELL_SIZE, y: 7 * CELL_SIZE, dir: DIRS.UP, nextDir: DIRS.UP, type: 'orange', state: 'house', frightenedTime: 0, startX: 8 * CELL_SIZE, startY: 7 * CELL_SIZE },
      ],
      score: 0,
      lives: 3,
      gameOver: false,
      win: false,
      xpAwarded: false,
      mode: 'scatter',
      modeTimer: 7 // 7 seconds scatter initially
    };
    syncUI();
  };

  const resetPositions = () => {
    gameState.current.player.x = 7 * CELL_SIZE;
    gameState.current.player.y = 11 * CELL_SIZE;
    gameState.current.player.dir = DIRS.NONE;
    gameState.current.player.nextDir = DIRS.NONE;

    gameState.current.ghosts.forEach(g => {
      g.x = g.startX;
      g.y = g.startY;
      g.state = g.type === 'red' ? 'scatter' : 'house';
      g.dir = DIRS.UP;
      g.frightenedTime = 0;
    });
    gameState.current.mode = 'scatter';
    gameState.current.modeTimer = 7;
  };

  const isWalkable = (cx: number, cy: number, isGhost: boolean = false) => {
    if (cy < 0 || cy >= ROWS) return false;
    if (cx < 0 || cx >= COLS) return (cy === 7); // Tunnel
    const cell = gameState.current.maze[cy][cx];
    if (cell === 1) return false;
    if (cell === 4 && !isGhost) return false;
    return true;
  };

  const updateGhostAI = (g: Entity, cx: number, cy: number) => {
    // If reached ghost house as eyes, respawn
    if (g.state === 'eyes' && cx === 7 && cy === 7) {
      g.state = gameState.current.mode;
    }
    // Simple house exit logic
    if (g.state === 'house') {
       if (cx === 7 && cy === 5) {
         g.state = gameState.current.mode; // Exited house
       } else {
         // Move towards 7,5
         g.dir = DIRS.UP;
         if (cy === 7 && cx !== 7) g.dir = cx < 7 ? DIRS.RIGHT : DIRS.LEFT;
         return;
       }
    }

    let target = { x: 7, y: 7 };
    if (g.state === 'eyes') {
      target = { x: 7, y: 7 };
    } else if (g.state === 'chase') {
      target = { x: Math.round(gameState.current.player.x/CELL_SIZE), y: Math.round(gameState.current.player.y/CELL_SIZE) };
    } else if (g.state === 'scatter') {
      if (g.type === 'red') target = { x: COLS - 2, y: 1 };
      if (g.type === 'pink') target = { x: 1, y: 1 };
      if (g.type === 'cyan') target = { x: COLS - 2, y: ROWS - 2 };
      if (g.type === 'orange') target = { x: 1, y: ROWS - 2 };
    }

    const possible = [DIRS.UP, DIRS.DOWN, DIRS.LEFT, DIRS.RIGHT].filter(d => 
      !(d.x === -g.dir.x && d.y === -g.dir.y) && isWalkable(cx + d.x, cy + d.y, true)
    );

    if (possible.length === 0) {
      g.dir = { x: -g.dir.x, y: -g.dir.y };
      return;
    }

    if (g.state === 'frightened') {
      g.dir = possible[Math.floor(Math.random() * possible.length)];
      return;
    }

    let bestDir = possible[0];
    let minD = Infinity;
    for (const d of possible) {
      const dist = Math.pow((cx + d.x) - target.x, 2) + Math.pow((cy + d.y) - target.y, 2);
      if (dist < minD) {
        minD = dist;
        bestDir = d;
      }
    }
    g.dir = bestDir;
  };

  const moveEntity = (ent: Entity, speed: number, dt: number, isGhost: boolean) => {
    if (ent.dir === DIRS.NONE && ent.nextDir === DIRS.NONE) return;
    
    let dist = speed * dt;
    while (dist > 0) {
      const step = Math.min(dist, 1);
      const oldX = ent.x;
      const oldY = ent.y;
      
      ent.x += ent.dir.x * step;
      ent.y += ent.dir.y * step;
      dist -= step;
      
      const boundaryX = ent.dir.x > 0 ? Math.floor(oldX/CELL_SIZE)*CELL_SIZE + CELL_SIZE : 
                        ent.dir.x < 0 ? Math.ceil(oldX/CELL_SIZE)*CELL_SIZE - CELL_SIZE : null;
      const boundaryY = ent.dir.y > 0 ? Math.floor(oldY/CELL_SIZE)*CELL_SIZE + CELL_SIZE : 
                        ent.dir.y < 0 ? Math.ceil(oldY/CELL_SIZE)*CELL_SIZE - CELL_SIZE : null;
                        
      const crossedX = boundaryX !== null && ((ent.dir.x > 0 && oldX < boundaryX && ent.x >= boundaryX) || (ent.dir.x < 0 && oldX > boundaryX && ent.x <= boundaryX));
      const crossedY = boundaryY !== null && ((ent.dir.y > 0 && oldY < boundaryY && ent.y >= boundaryY) || (ent.dir.y < 0 && oldY > boundaryY && ent.y <= boundaryY));
      
      // Force alignment check on start
      const exactlyAligned = (ent.x % CELL_SIZE === 0 && ent.y % CELL_SIZE === 0);

      if (crossedX || crossedY || (exactlyAligned && (ent.x !== ent.lastNodeX || ent.y !== ent.lastNodeY))) {
        if (crossedX) ent.x = boundaryX!;
        if (crossedY) ent.y = boundaryY!;
        ent.lastNodeX = ent.x;
        ent.lastNodeY = ent.y;
        
        const cx = Math.round(ent.x / CELL_SIZE);
        const cy = Math.round(ent.y / CELL_SIZE);
        
        if (!isGhost) {
          if (ent.nextDir !== ent.dir && (ent.nextDir.x !== 0 || ent.nextDir.y !== 0)) {
            if (isWalkable(cx + ent.nextDir.x, cy + ent.nextDir.y, false)) {
              ent.dir = ent.nextDir;
            }
          }
        } else {
          updateGhostAI(ent, cx, cy);
        }
        
        if (!isWalkable(cx + ent.dir.x, cy + ent.dir.y, isGhost)) {
          ent.dir = DIRS.NONE;
          dist = 0;
          break;
        }
      }
    }

    if (ent.y === 7 * CELL_SIZE) {
      if (ent.x < -CELL_SIZE) ent.x = CANVAS_WIDTH;
      if (ent.x > CANVAS_WIDTH) ent.x = -CELL_SIZE;
    }
  };

  const update = useCallback((time: number) => {
    const state = gameState.current;
    if (state.gameOver || state.win) return;

    if (!state.lastTime) state.lastTime = time;
    const dt = Math.min((time - state.lastTime) / 1000, 0.05); // cap at 50ms
    state.lastTime = time;

    // Mode Timers (Scatter <-> Chase)
    state.modeTimer -= dt;
    if (state.modeTimer <= 0) {
       if (state.mode === 'scatter') {
         state.mode = 'chase';
         state.modeTimer = 20;
       } else {
         state.mode = 'scatter';
         state.modeTimer = 7;
       }
       state.ghosts.forEach(g => {
         if (g.state === 'scatter' || g.state === 'chase') {
           g.state = state.mode;
           g.dir = { x: -g.dir.x, y: -g.dir.y }; // Reverse direction on mode switch
         }
       });
    }

    moveEntity(state.player, BASE_SPEED, dt, false);
    
    state.ghosts.forEach(g => {
      let speedMult = 0.85;
      if (g.state === 'frightened') {
        g.frightenedTime -= dt;
        if (g.frightenedTime <= 0) {
          g.state = state.mode; // Return to normal
        }
        speedMult = 0.5;
      } else if (g.state === 'eyes') {
        speedMult = 2.0; // Fast return to house
      }
      moveEntity(g, BASE_SPEED * speedMult, dt, true);
    });

    // Eat dot
    const cx = Math.round(state.player.x / CELL_SIZE);
    const cy = Math.round(state.player.y / CELL_SIZE);
    
    // Allow slight leniency for eating
    const distToCenter = Math.abs(state.player.x - cx * CELL_SIZE) + Math.abs(state.player.y - cy * CELL_SIZE);
    if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && distToCenter < CELL_SIZE/2) {
      const cell = state.maze[cy][cx];
      if (cell === 0 || cell === 3) {
        state.maze[cy][cx] = 2; 
        state.dotsCount--;
        state.score += (cell === 3 ? 50 : 10);
        
        if (cell === 3) {
          state.ghosts.forEach(g => {
            if (g.state === 'scatter' || g.state === 'chase') {
              g.state = 'frightened';
              g.frightenedTime = 7; // 7 seconds
              g.dir = { x: -g.dir.x, y: -g.dir.y };
            }
          });
        }
        syncUI();
        
        if (state.dotsCount === 0) {
          state.win = true;
          if (!state.xpAwarded) {
             addXp(100);
             state.xpAwarded = true;
          }
          syncUI();
          return;
        }
      }
    }

    // Ghost collision
    for (const g of state.ghosts) {
      const dist = Math.abs(g.x - state.player.x) + Math.abs(g.y - state.player.y);
      if (dist < CELL_SIZE - 5) {
        if (g.state === 'frightened') {
          g.state = 'eyes';
          g.frightenedTime = 0;
          state.score += 200;
          syncUI();
        } else if (g.state === 'chase' || g.state === 'scatter') {
          state.lives--;
          syncUI();
          if (state.lives <= 0) {
            state.gameOver = true;
            if (!state.xpAwarded) {
              addXp(Math.floor(state.score / 5));
              state.xpAwarded = true;
            }
            syncUI();
          } else {
            resetPositions();
          }
          return;
        }
      }
    }
  }, [addXp]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.maze[r][c];
        if (cell === 1) {
          ctx.fillStyle = '#1e3a8a'; 
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#3b82f6';
          ctx.strokeRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        } else if (cell === 4) {
          ctx.fillStyle = '#f472b6'; // Door
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE + CELL_SIZE/2 - 2, CELL_SIZE, 4);
        } else if (cell === 0) {
          ctx.fillStyle = '#fef08a'; 
          ctx.beginPath();
          ctx.arc(c * CELL_SIZE + CELL_SIZE/2, r * CELL_SIZE + CELL_SIZE/2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          ctx.fillStyle = '#fef08a'; 
          ctx.beginPath();
          ctx.arc(c * CELL_SIZE + CELL_SIZE/2, r * CELL_SIZE + CELL_SIZE/2, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Player
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    let angle = 0;
    if (state.player.dir === DIRS.RIGHT) angle = 0;
    else if (state.player.dir === DIRS.DOWN) angle = 0.5 * Math.PI;
    else if (state.player.dir === DIRS.LEFT) angle = Math.PI;
    else if (state.player.dir === DIRS.UP) angle = 1.5 * Math.PI;
    else if (state.player.nextDir === DIRS.RIGHT) angle = 0;
    else if (state.player.nextDir === DIRS.DOWN) angle = 0.5 * Math.PI;
    else if (state.player.nextDir === DIRS.LEFT) angle = Math.PI;
    else if (state.player.nextDir === DIRS.UP) angle = 1.5 * Math.PI;
    
    const isMoving = state.player.dir !== DIRS.NONE;
    const chomp = isMoving ? (Math.sin(Date.now() / 80) + 1) * 0.15 : 0.2; 
    
    ctx.arc(
      state.player.x + CELL_SIZE/2, 
      state.player.y + CELL_SIZE/2, 
      CELL_SIZE/2 - 4, 
      angle + chomp * Math.PI, 
      angle + (2 - chomp) * Math.PI
    );
    ctx.lineTo(state.player.x + CELL_SIZE/2, state.player.y + CELL_SIZE/2);
    ctx.fill();

    // Ghosts
    state.ghosts.forEach(g => {
      let color = g.type === 'red' ? '#ef4444' : g.type === 'pink' ? '#f472b6' : g.type === 'cyan' ? '#22d3ee' : '#f97316';
      
      if (g.state === 'frightened') {
        color = '#3b82f6';
        if (g.frightenedTime < 2.0 && Math.floor(g.frightenedTime * 5) % 2 === 0) {
          color = 'white'; // Warning flash
        }
      } else if (g.state === 'eyes') {
        color = 'transparent';
      }

      const gx = g.x + CELL_SIZE/2;
      const gy = g.y + CELL_SIZE/2;
      const r = CELL_SIZE/2 - 4;

      if (color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(gx, gy, r, Math.PI, 0);
        ctx.lineTo(gx + r, gy + r);
        ctx.lineTo(gx - r, gy + r);
        ctx.fill();
      }
      
      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(gx - 4, gy - 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + 4, gy - 2, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = g.state === 'frightened' ? 'transparent' : 'blue';
      ctx.beginPath(); ctx.arc(gx - 4 + g.dir.x * 2, gy - 2 + g.dir.y * 2, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + 4 + g.dir.x * 2, gy - 2 + g.dir.y * 2, 1.5, 0, Math.PI*2); ctx.fill();
    });

  }, []);

  const loop = useCallback((time: number) => {
    update(time);
    const canvas = canvasRef.current;
    if (canvas && !gameState.current.gameOver && !gameState.current.win) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    // Only continue loop if game is active
    if (!gameState.current.gameOver && !gameState.current.win) {
      requestRef.current = requestAnimationFrame(loop);
    }
  }, [update, draw]);

  useEffect(() => {
    // High DPI Canvas Scaling
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        // Initial draw
        draw(ctx);
      }
    }
    
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop, draw]);

  useEffect(() => {
    initGame();
  }, []);

  const handleDPad = (dir: 'UP'|'DOWN'|'LEFT'|'RIGHT', e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    gameState.current.player.nextDir = DIRS[dir];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
      }
      if (key === 'arrowup' || key === 'w') handleDPad('UP');
      if (key === 'arrowdown' || key === 's') handleDPad('DOWN');
      if (key === 'arrowleft' || key === 'a') handleDPad('LEFT');
      if (key === 'arrowright' || key === 'd') handleDPad('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Maze-Muncher</h2>
          <div className={styles.scoreBoard}>Score: {uiState.score}</div>
          <div className={styles.livesBoard}>Lives: {uiState.lives}</div>
        </div>

        <div className={styles.canvasContainer}>
          <canvas 
            ref={canvasRef} 
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%', aspectRatio: '1/1' }}
            className={styles.canvas}
          />
        </div>

        {(uiState.gameOver || uiState.win) && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: uiState.win ? '#10b981' : '#ef4444' }}>
              {uiState.win ? 'MAZE CLEARED!' : 'GAME OVER!'}
            </h2>
            <p>Score: {uiState.score}</p>
            <p>XP Earned: {uiState.win ? '+100' : `+${Math.floor(uiState.score / 5)}`}</p>
            <button 
              onClick={() => {
                initGame();
                requestRef.current = requestAnimationFrame(loop);
              }} 
              className={styles.restartBtn}
            >
              Play Again
            </button>
          </div>
        )}
        
        <div className={styles.dpad}>
          <button className={`${styles.dpadBtn} ${styles.up}`} onTouchStart={(e) => handleDPad('UP', e)} onMouseDown={(e) => handleDPad('UP', e)}>↑</button>
          <button className={`${styles.dpadBtn} ${styles.left}`} onTouchStart={(e) => handleDPad('LEFT', e)} onMouseDown={(e) => handleDPad('LEFT', e)}>←</button>
          <button className={`${styles.dpadBtn} ${styles.down}`} onTouchStart={(e) => handleDPad('DOWN', e)} onMouseDown={(e) => handleDPad('DOWN', e)}>↓</button>
          <button className={`${styles.dpadBtn} ${styles.right}`} onTouchStart={(e) => handleDPad('RIGHT', e)} onMouseDown={(e) => handleDPad('RIGHT', e)}>→</button>
        </div>
      </div>
    </div>
  );
};

export default MazeMuncher;
