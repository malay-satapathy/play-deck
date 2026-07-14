import React, { useEffect, useRef, useState, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './NeonRider.module.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const PLAYER_SIZE = 25; // slightly smaller visually
const PLAYER_Y = CANVAS_HEIGHT - 80;
const BASE_SPEED = 6;

const NeonRider: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const { addXp } = useGlobalState();
  const addXpRef = useRef(addXp);
  addXpRef.current = addXp;
  
  const gameOverRef = useRef(false);

  const stateRef = useRef({
    playerX: CANVAS_WIDTH / 2,
    obstacles: [] as { x: number, y: number, w: number, h: number, speed: number }[],
    score: 0,
    speedMult: 1,
    keys: { left: false, right: false },
    gridOffset: 0
  });

  const requestRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const gameLoop = useCallback((time: number) => {
    if (gameOverRef.current) return;

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
    }

    // Clamp dt to prevent massive jumps if tab was inactive
    const rawDt = (time - lastTimeRef.current) / 16.666;
    const dt = Math.min(rawDt, 3.0); 
    lastTimeRef.current = time;

    const state = stateRef.current;
    
    // Move player (decoupled from forward speed)
    const moveDelta = 12 * dt;
    if (state.keys.left) state.playerX = Math.max(PLAYER_SIZE, state.playerX - moveDelta);
    if (state.keys.right) state.playerX = Math.min(CANVAS_WIDTH - PLAYER_SIZE, state.playerX + moveDelta);

    // Speed increases over time, scaled reasonably
    state.speedMult += 0.0005 * dt;

    // Spawn obstacles (capped spawn rate)
    const spawnInterval = Math.max(300, 1000 / state.speedMult);
    if (time - lastSpawnRef.current > spawnInterval) {
      const w = 40 + Math.random() * 80;
      const x = Math.random() * (CANVAS_WIDTH - w);
      state.obstacles.push({
        x, y: -50, w, h: 20, speed: BASE_SPEED * state.speedMult
      });
      lastSpawnRef.current = time;
    }

    // Move obstacles and check collision
    let collided = false;
    
    // Tighter player bounding box (center of triangle)
    const px = state.playerX;
    const py = PLAYER_Y + 10;
    const pw = 20; 
    const ph = 20;

    state.obstacles = state.obstacles.filter(obs => {
      obs.y += obs.speed * dt;
      
      // Collision AABB with tighter bounding box
      if (
        obs.y + obs.h > py - ph/2 &&
        obs.y < py + ph/2 &&
        obs.x + obs.w > px - pw/2 &&
        obs.x < px + pw/2
      ) {
        collided = true;
      }
      
      return obs.y < CANVAS_HEIGHT;
    });

    if (collided) {
      gameOverRef.current = true;
      const finalScore = Math.floor(state.score);
      setScore(finalScore);
      setGameOver(true);
      addXpRef.current(Math.floor(finalScore / 10)); // Give XP based on score
      return;
    }

    state.score += 0.1 * state.speedMult;

    // Drawing
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
         ctx.fillStyle = '#09090b'; 
         ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

         // Grid
         state.gridOffset = (state.gridOffset + state.speedMult * dt * 2) % 40;
         ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
           ctx.moveTo(0, y + state.gridOffset);
           ctx.lineTo(CANVAS_WIDTH, y + state.gridOffset);
         }
         for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
           ctx.moveTo(x, 0);
           ctx.lineTo(x, CANVAS_HEIGHT);
         }
         ctx.stroke();

         // Score (drawn on canvas)
         ctx.fillStyle = '#06b6d4';
         ctx.font = 'bold 24px monospace';
         ctx.textAlign = 'right';
         ctx.fillText(`SCORE: ${Math.floor(state.score)}`, CANVAS_WIDTH - 20, 40);

         // Obstacles (Fake glow using slightly larger rect with low opacity)
         state.obstacles.forEach(obs => {
           ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
           ctx.fillRect(obs.x - 4, obs.y - 4, obs.w + 8, obs.h + 8); 
           ctx.fillStyle = '#06b6d4';
           ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
         });

         // Player (Fake glow)
         ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
         ctx.beginPath();
         ctx.moveTo(state.playerX, PLAYER_Y - PLAYER_SIZE - 4);
         ctx.lineTo(state.playerX + PLAYER_SIZE + 4, PLAYER_Y + PLAYER_SIZE + 4);
         ctx.lineTo(state.playerX - PLAYER_SIZE - 4, PLAYER_Y + PLAYER_SIZE + 4);
         ctx.fill();
         
         ctx.fillStyle = '#ec4899'; 
         ctx.beginPath();
         ctx.moveTo(state.playerX, PLAYER_Y - PLAYER_SIZE);
         ctx.lineTo(state.playerX + PLAYER_SIZE, PLAYER_Y + PLAYER_SIZE);
         ctx.lineTo(state.playerX - PLAYER_SIZE, PLAYER_Y + PLAYER_SIZE);
         ctx.fill();
      }
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Event listeners in a separate useEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) e.preventDefault();
      if (key === 'arrowleft' || key === 'a') stateRef.current.keys.left = true;
      if (key === 'arrowright' || key === 'd') stateRef.current.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') stateRef.current.keys.left = false;
      if (key === 'arrowright' || key === 'd') stateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Start game loop
  useEffect(() => {
    if (!gameOverRef.current) {
        lastTimeRef.current = 0; // Reset time so dt is calculated correctly on first frame
        requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  const restart = () => {
    stateRef.current = {
      playerX: CANVAS_WIDTH / 2,
      obstacles: [],
      score: 0,
      speedMult: 1,
      keys: { left: false, right: false },
      gridOffset: 0
    };
    lastSpawnRef.current = performance.now();
    lastTimeRef.current = 0; // CRITICAL: Reset time
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
    
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameArea}>
        <div className={styles.hud}>
          <span>Neon Rider</span>
        </div>
        
        <div className={styles.canvasWrapper}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className={styles.canvas}
          />
          
          {gameOver && (
            <div className={styles.gameOverOverlay}>
              <h2>CRASHED!</h2>
              <p>Score: {score}</p>
              <p>Earned {Math.floor(score / 10)} global XP!</p>
              <button onClick={restart} className={styles.restartBtn}>Ride Again</button>
            </div>
          )}
        </div>
        <div className={styles.controlsText}>
          Use ⬅️ and ➡️ arrow keys to dodge
        </div>
      </div>
    </div>
  );
};

export default NeonRider;
