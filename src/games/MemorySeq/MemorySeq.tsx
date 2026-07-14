import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './MemorySeq.module.css';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']; // Red, Green, Blue, Yellow
const SOUNDS = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (frequencies)

const MemorySeq: React.FC = () => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initGame = useCallback(() => {
    setSequence([Math.floor(Math.random() * 4)]);
    setPlayerStep(0);
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  const playTone = (freq: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const playSequence = useCallback(async () => {
    setIsPlaying(true);
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400)); // gap between notes
      
      const btn = sequence[i];
      setActiveButton(btn);
      playTone(SOUNDS[btn]);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // note duration
      setActiveButton(null);
    }
    setIsPlaying(false);
  }, [sequence]);

  useEffect(() => {
    if (sequence.length > 0 && !gameOver) {
      playSequence();
    }
  }, [sequence, gameOver, playSequence]);

  const handleButtonClick = (index: number) => {
    if (isPlaying || gameOver) return;

    // Play feedback
    setActiveButton(index);
    playTone(SOUNDS[index]);
    setTimeout(() => setActiveButton(null), 200);

    // Check logic
    if (index === sequence[playerStep]) {
      const nextStep = playerStep + 1;
      setPlayerStep(nextStep);
      
      if (nextStep === sequence.length) {
        // Level up
        setPlayerStep(0);
        setTimeout(() => {
          setSequence(prev => [...prev, Math.floor(Math.random() * 4)]);
        }, 1000);
      }
    } else {
      // Wrong
      setGameOver(true);
      addXp(sequence.length * 5); // 5 XP per level reached
      // Play error tone
      playTone(100);
    }
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Memory-Seq</h2>
          <div className={styles.scoreBoard}>Level: {sequence.length || 1}</div>
        </div>

        <div className={styles.simonContainer}>
          <div className={styles.simonBoard}>
            {COLORS.map((color, idx) => (
              <div 
                key={idx}
                className={`${styles.simonBtn} ${styles['btn-' + idx]} ${activeButton === idx ? styles.active : ''}`}
                style={{ '--btn-color': color } as React.CSSProperties}
                onMouseDown={() => handleButtonClick(idx)}
                onTouchStart={(e) => { e.preventDefault(); handleButtonClick(idx); }}
              />
            ))}
            <div className={styles.centerCircle}>
              {gameOver ? 'GAME OVER' : (isPlaying ? 'WATCH' : 'PLAY')}
            </div>
          </div>
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>SEQUENCE BROKEN!</h2>
            <p>You reached Level: {sequence.length}</p>
            <p>XP Earned: +{sequence.length * 5}</p>
            <button onClick={initGame} className={styles.restartBtn}>Try Again</button>
          </div>
        )}

        {sequence.length === 0 && !gameOver && (
          <div className={styles.startOverlay}>
            <button onClick={initGame} className={styles.restartBtn}>START</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemorySeq;
