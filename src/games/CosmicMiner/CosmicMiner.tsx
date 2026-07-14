import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './CosmicMiner.module.css';

const GAME_DURATION = 60; // 60 seconds

type Asteroid = {
  id: number;
  x: number; // percentage
  y: number; // percentage
  size: number;
};

type Particle = {
  id: number;
  left: string;
  top: string;
  xp: boolean;
};

const CosmicMiner: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [asteroid, setAsteroid] = useState<Asteroid | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [missFlash, setMissFlash] = useState(false);
  
  const { addXp } = useGlobalState();
  const asteroidIdCounter = useRef(0);
  const particleIdCounter = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);
  
  const spawnAsteroid = useCallback(() => {
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    const size = 50 + Math.random() * 70; // 50px to 120px
    setAsteroid({
      id: asteroidIdCounter.current++,
      x,
      y,
      size
    });
  }, []);

  // Timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Despawn loop
  useEffect(() => {
    if (!isPlaying) return;
    const despawnInterval = setInterval(() => {
      spawnAsteroid();
    }, 1200); // asteroid despawns every 1.2s if not clicked
    return () => clearInterval(despawnInterval);
  }, [isPlaying, spawnAsteroid]);

  // Cleanup floating particles safely
  useEffect(() => {
    return () => {
      // Any necessary cleanup on unmount
    };
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
    setGameOver(false);
    spawnAsteroid();
  };

  const handleAsteroidClick = (e: React.MouseEvent | React.KeyboardEvent | React.PointerEvent) => {
    e.stopPropagation();
    if (!isPlaying) return;
    
    let left = '50%';
    let top = '50%';
    
    if ('clientX' in e && e.clientX !== 0 && e.clientY !== 0) {
      const rect = gameAreaRef.current?.getBoundingClientRect();
      if (rect) {
        left = `${e.clientX - rect.left}px`;
        top = `${e.clientY - rect.top}px`;
      }
    } else if (asteroid) {
      left = `${asteroid.x}%`;
      top = `${asteroid.y}%`;
    }
    
    const gotXp = Math.random() < 0.15;
    if (gotXp) addXp(1);
    
    const pId = particleIdCounter.current++;
    setParticles(prev => [...prev, { id: pId, left, top, xp: gotXp }]);
    
    // Safely remove particle later
    addTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== pId));
    }, 600);
    
    setScore(s => s + 10);
    spawnAsteroid(); // respawn immediately
  };
  
  const handleMissClick = () => {
    if (!isPlaying) return;
    setTimeLeft(prev => Math.max(0, prev - 1)); // -1 second penalty
    setMissFlash(true);
    addTimeout(() => setMissFlash(false), 150);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.hud}>
        <div className={styles.score}>SCORE: {score}</div>
        <div className={styles.timer}>TIME: {timeLeft}s</div>
      </div>

      <div 
        ref={gameAreaRef}
        className={`${styles.gameArea} ${missFlash ? styles.miss : ''}`}
        onPointerDown={handleMissClick}
      >
        {!isPlaying && !gameOver && (
          <div className={styles.overlay}>
            <h2>Cosmic Miner</h2>
            <p>Mine asteroids fast! Misses cost 1 second.</p>
            <button className={styles.startBtn} onClick={startGame}>Start Mining</button>
          </div>
        )}
        
        {gameOver && (
          <div className={styles.overlay}>
            <h2>TIME'S UP!</h2>
            <p>Final Score: {score}</p>
            <p>Global XP Earned: +{Math.floor(score / 50)}</p>
            <button className={styles.startBtn} onClick={() => {
              addXp(Math.floor(score / 50));
              startGame();
            }}>Play Again</button>
          </div>
        )}

        {isPlaying && asteroid && (
          <button
            key={asteroid.id}
            className={styles.asteroidBtn}
            style={{ 
              left: `${asteroid.x}%`, 
              top: `${asteroid.y}%`, 
              width: `${asteroid.size}px`, 
              height: `${asteroid.size}px` 
            }}
            onPointerDown={handleAsteroidClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleAsteroidClick(e);
            }}
          >
            <div className={styles.asteroidGraphic} />
          </button>
        )}

        {particles.map(p => (
          <div 
            key={p.id}
            className={`${styles.particle} ${p.xp ? styles.xpParticle : ''}`}
            style={{ left: p.left, top: p.top }}
          >
            {p.xp ? '+10 (+1 XP)' : '+10'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CosmicMiner;
