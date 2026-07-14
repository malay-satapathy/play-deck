import React, { useEffect, useRef, useState, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './NeonRider.module.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const PLAYER_SIZE = 30;
const PLAYER_Y = CANVAS_HEIGHT - 60;
const BASE_SPEED = 5;

const NeonRider: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const { addXp } = useGlobalState();
  
  const stateRef = useRef({
    playerX: CANVAS_WIDTH / 2,
    obstacles: [] as { x: number, y: number, w: number, h: number, speed: number }[],
    score: 0,
    speedMult: 1,
    keys: { left: false, right: false }
  });

  const requestRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#09090b'; // dark bg
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines for synthwave feel
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
    ctx.lineWidth = 2;
    const offset = (Date.now() / 20) % 40;
    
    ctx.beginPath();
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.moveTo(0, y + offset);
      ctx.lineTo(CANVAS_WIDTH, y + offset);
    }
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    ctx.stroke();

    const state = stateRef.current;

    // Draw score in background
    ctx.fillStyle = 'rgba(236, 72, 153, 0.08)';
    ctx.font = 'bold 250px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(state.score).toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    // Draw obstacles
    ctx.fillStyle = '#06b6d4'; // cyan
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    state.obstacles.forEach(obs => {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });

    // Draw player (triangle)
    ctx.fillStyle = '#ec4899'; // pink
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(state.playerX, PLAYER_Y - PLAYER_SIZE);
    ctx.lineTo(state.playerX + PLAYER_SIZE, PLAYER_Y + PLAYER_SIZE);
    ctx.lineTo(state.playerX - PLAYER_SIZE, PLAYER_Y + PLAYER_SIZE);
    ctx.fill();

    ctx.shadowBlur = 0; // reset
  }, []);

  const lastTimeRef = useRef<number>(performance.now());

  const gameLoop = useCallback((time: number) => {
    if (gameOver) {
      lastTimeRef.current = time;
      return;
    }

    const dt = (time - lastTimeRef.current) / 16.666;
    lastTimeRef.current = time;

    const state = stateRef.current;
    
    // Move player
    const moveDelta = 7 * state.speedMult * dt;
    if (state.keys.left) state.playerX = Math.max(PLAYER_SIZE, state.playerX - moveDelta);
    if (state.keys.right) state.playerX = Math.min(CANVAS_WIDTH - PLAYER_SIZE, state.playerX + moveDelta);

    // Speed increases over time, much faster scaling
    state.speedMult += 0.001 * dt;

    // Spawn obstacles
    if (time - lastSpawnRef.current > 1000 / state.speedMult) {
      const w = 40 + Math.random() * 80;
      const x = Math.random() * (CANVAS_WIDTH - w);
      state.obstacles.push({
        x, y: -50, w, h: 20, speed: BASE_SPEED * state.speedMult
      });
      lastSpawnRef.current = time;
    }

    // Move obstacles and check collision
    let collided = false;
    state.obstacles = state.obstacles.filter(obs => {
      obs.y += obs.speed * dt;
      
      // Collision AABB with player bounding box roughly
      if (
        obs.y + obs.h > PLAYER_Y - PLAYER_SIZE &&
        obs.y < PLAYER_Y + PLAYER_SIZE &&
        obs.x + obs.w > state.playerX - PLAYER_SIZE &&
        obs.x < state.playerX + PLAYER_SIZE
      ) {
        collided = true;
      }
      
      return obs.y < CANVAS_HEIGHT;
    });

    if (collided) {
      setGameOver(true);
      setScore(Math.floor(state.score));
      addXp(Math.floor(state.score / 10)); // Give XP based on score
      return;
    }

    state.score += 0.1 * state.speedMult;
    setScore(Math.floor(state.score));

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [draw, gameOver, addXp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stateRef.current.keys.left = true;
      if (e.key === 'ArrowRight') stateRef.current.keys.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') stateRef.current.keys.left = false;
      if (e.key === 'ArrowRight') stateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  const restart = () => {
    stateRef.current = {
      playerX: CANVAS_WIDTH / 2,
      obstacles: [],
      score: 0,
      speedMult: 1,
      keys: { left: false, right: false }
    };
    lastSpawnRef.current = performance.now();
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameArea}>
        <div className={styles.hud}>
          <span>Neon Rider</span>
          <span className={styles.scoreText}>Score: {score}</span>
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
