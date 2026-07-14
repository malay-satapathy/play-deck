import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './MemorySeq.module.css';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']; // Red, Green, Blue, Yellow
const SOUNDS = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (frequencies)

type GameStatus = 'IDLE' | 'WATCH' | 'PLAY' | 'WAIT' | 'GAMEOVER';

const SimonButton = React.memo(({ 
  idx, color, isActive, onPointerDown, onPointerUp, disabled
}: {
  idx: number, color: string, isActive: boolean, 
  onPointerDown: (idx: number) => void, onPointerUp: (idx: number) => void, disabled: boolean
}) => (
  <div 
    className={`${styles.simonBtn} ${styles['btn-' + idx]} ${isActive ? styles.active : ''}`}
    style={{ '--btn-color': color } as React.CSSProperties}
    onPointerDown={() => {
      if (!disabled) onPointerDown(idx);
    }}
    onPointerUp={() => onPointerUp(idx)}
    onPointerLeave={() => onPointerUp(idx)}
  />
));

const MemorySeq: React.FC = () => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('IDLE');
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);
  
  const { addXp } = useGlobalState();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscRef = useRef<{ osc: OscillatorNode, gainNode: GainNode } | null>(null);
  const playbackRef = useRef<number>(0);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      playbackRef.current++; // Abort any ongoing sequence promises
      timeoutRefs.current.forEach(clearTimeout);
      if (activeOscRef.current) {
        try { activeOscRef.current.osc.stop(); } catch(e) {}
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const stopTone = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !activeOscRef.current) return;
    const { osc, gainNode } = activeOscRef.current;
    try {
      gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // ignore state errors
    }
    activeOscRef.current = null;
  }, []);

  const startTone = useCallback((freq: number, type: OscillatorType = 'sine') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (activeOscRef.current) stopTone();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    activeOscRef.current = { osc, gainNode };
  }, [stopTone]);

  const playTone = useCallback((freq: number, durationMs: number, type: OscillatorType = 'sine') => {
    startTone(freq, type);
    addTimeout(() => stopTone(), durationMs);
  }, [startTone, stopTone, addTimeout]);

  const initGame = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    
    playbackRef.current++; // abort any existing
    setSequence([Math.floor(Math.random() * 4)]);
    setPlayerStep(0);
    setIsError(false);
    setGameStatus('WATCH');
  }, []);

  const playSequence = useCallback(async () => {
    const currentPlaybackId = ++playbackRef.current;
    setGameStatus('WATCH');
    
    // Dynamic speeds (progressive)
    const noteDuration = Math.max(150, 500 - sequence.length * 20);
    const gapDuration = Math.max(50, 400 - sequence.length * 15);
    
    // Initial delay
    await new Promise(resolve => setTimeout(resolve, 800));

    for (let i = 0; i < sequence.length; i++) {
      if (playbackRef.current !== currentPlaybackId) return;
      
      const btn = sequence[i];
      setActiveButton(btn);
      startTone(SOUNDS[btn]);
      
      await new Promise(resolve => setTimeout(resolve, noteDuration));
      if (playbackRef.current !== currentPlaybackId) {
        stopTone();
        return;
      }
      
      setActiveButton(null);
      stopTone();
      await new Promise(resolve => setTimeout(resolve, gapDuration));
      if (playbackRef.current !== currentPlaybackId) return;
    }
    setGameStatus('PLAY');
  }, [sequence, startTone, stopTone]);

  useEffect(() => {
    if (sequence.length > 0 && gameStatus === 'WATCH') {
      playSequence();
    }
  }, [sequence, gameStatus, playSequence]);

  // Player Input Timeout
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (gameStatus === 'PLAY') {
      timer = setTimeout(() => {
        setGameStatus('GAMEOVER');
        addXp(sequence.length * 5);
        playTone(100, 600, 'sawtooth');
        setIsError(true);
      }, 5000); // 5 seconds to act
    }
    return () => clearTimeout(timer);
  }, [gameStatus, playerStep, sequence.length, addXp, playTone]);

  const handlePointerDown = useCallback((index: number) => {
    if (gameStatus !== 'PLAY') return;
    setActiveButton(index);
    startTone(SOUNDS[index]);
  }, [gameStatus, startTone]);

  const handlePointerUp = useCallback((index: number) => {
    if (gameStatus !== 'PLAY' || activeButton !== index) return;
    
    setActiveButton(null);
    stopTone();
    
    setPlayerStep(prevStep => {
      if (index === sequence[prevStep]) {
        const nextStep = prevStep + 1;
        if (nextStep === sequence.length) {
          setGameStatus('WAIT');
          // Level up chime
          addTimeout(() => playTone(659.25, 150, 'sine'), 200); // E5
          addTimeout(() => playTone(1046.50, 250, 'sine'), 350); // C6
          
          addTimeout(() => {
            setSequence(seq => [...seq, Math.floor(Math.random() * 4)]);
            setPlayerStep(0);
            setGameStatus('WATCH');
          }, 1200);
        }
        return nextStep;
      } else {
        setGameStatus('GAMEOVER');
        addXp(sequence.length * 5);
        playTone(100, 600, 'sawtooth');
        setIsError(true);
        return prevStep;
      }
    });
  }, [gameStatus, activeButton, sequence, stopTone, playTone, addXp]);

  const getStatusText = () => {
    switch (gameStatus) {
      case 'GAMEOVER': return 'GAME OVER';
      case 'WATCH': return 'WATCH';
      case 'PLAY': return 'PLAY';
      case 'WAIT': return 'NICE!';
      default: return 'SIMON';
    }
  };

  const statusColor = () => {
    if (gameStatus === 'WATCH') return '#eab308';
    if (gameStatus === 'PLAY') return '#22c55e';
    if (gameStatus === 'WAIT') return '#3b82f6';
    if (gameStatus === 'GAMEOVER') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Memory-Seq</h2>
          <div className={styles.scoreBoard}>Level: {sequence.length || 1}</div>
        </div>

        <div className={`${styles.simonContainer} ${gameStatus !== 'PLAY' ? styles.disabledCursor : ''}`}>
          <div className={`${styles.simonBoard} ${isError ? styles.errorFlash : ''}`}>
            {COLORS.map((color, idx) => (
              <SimonButton 
                key={idx}
                idx={idx}
                color={color}
                isActive={activeButton === idx}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                disabled={gameStatus !== 'PLAY'}
              />
            ))}
            <div className={styles.centerCircle} style={{ color: statusColor() }}>
              {getStatusText()}
            </div>
          </div>
        </div>

        {gameStatus === 'GAMEOVER' && (
          <div className={styles.gameOverOverlay}>
            <h2>SEQUENCE BROKEN!</h2>
            <p>You reached Level: {sequence.length}</p>
            <p>XP Earned: +{sequence.length * 5}</p>
            <button onClick={initGame} className={styles.restartBtn}>Try Again</button>
          </div>
        )}

        {gameStatus === 'IDLE' && (
          <div className={styles.startOverlay}>
            <button onClick={initGame} className={styles.restartBtn}>START</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemorySeq;
