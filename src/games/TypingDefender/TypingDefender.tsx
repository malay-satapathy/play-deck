import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './TypingDefender.module.css';

const DICTIONARY = [
  'function', 'variable', 'component', 'react', 'promise', 'async', 'await', 
  'boolean', 'string', 'number', 'array', 'object', 'interface', 'class', 
  'export', 'import', 'default', 'return', 'console', 'window', 'document',
  'typescript', 'javascript', 'frontend', 'backend', 'fullstack', 'developer'
];

interface Word {
  id: number;
  text: string;
  x: number; // percentage
  spawnTime: number;
}

const FALL_DURATION = 8000; // ms to reach bottom

const TypingDefender: React.FC = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [input, setInput] = useState('');
  const [targetedWordId, setTargetedWordId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  
  const { addXp } = useGlobalState();
  const idCounter = useRef(0);
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

  // Use refs for state accessed inside interval/listeners to avoid dependency thrashing
  const stateRef = useRef({ words, input, targetedWordId, gameOver, score });
  useEffect(() => {
    stateRef.current = { words, input, targetedWordId, gameOver, score };
  }, [words, input, targetedWordId, gameOver, score]);

  const handleDamage = useCallback((amount: number) => {
    setHealth(h => {
      const newH = h - amount;
      if (newH <= 0 && h > 0) {
        setGameOver(true);
        addXp(Math.floor(stateRef.current.score / 2));
      }
      return newH;
    });
    setDamageFlash(true);
    addTimeout(() => setDamageFlash(false), 200);
  }, [addXp, addTimeout]);

  const spawnWord = useCallback(() => {
    const text = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
    const x = 10 + Math.random() * 80; // 10% to 90%
    setWords(prev => [...prev, { id: idCounter.current++, text, x, spawnTime: Date.now() }]);
  }, []);

  // Spawner interval
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(spawnWord, 2000);
    return () => clearInterval(interval);
  }, [spawnWord, gameOver]);

  // Hit detection interval
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const { words: currentWords, targetedWordId: currentTargetId } = stateRef.current;
      
      const missed = currentWords.filter(w => now - w.spawnTime >= FALL_DURATION);
      if (missed.length > 0) {
        handleDamage(missed.length);
        
        // If the targeted word was missed, clear input
        if (currentTargetId !== null && missed.some(w => w.id === currentTargetId)) {
          setInput('');
          setTargetedWordId(null);
        }
        
        setWords(prev => prev.filter(w => now - w.spawnTime < FALL_DURATION));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameOver, handleDamage]);

  // Typing logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { gameOver, words, input, targetedWordId } = stateRef.current;
      if (gameOver) return;
      
      if (e.key === 'Escape') {
        setInput('');
        setTargetedWordId(null);
        return;
      }
      
      if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        const key = e.key.toLowerCase();
        
        if (targetedWordId !== null) {
          // We have a target
          const target = words.find(w => w.id === targetedWordId);
          if (target && target.text[input.length] === key) {
            // Correct key
            const nextInput = input + key;
            if (nextInput === target.text) {
              // Word destroyed
              setScore(s => s + target.text.length * 10);
              setWords(prev => prev.filter(w => w.id !== target.id));
              setInput('');
              setTargetedWordId(null);
            } else {
              setInput(nextInput);
            }
          } else {
            // Wrong key! Auto-clear and penalize
            setInput('');
            setTargetedWordId(null);
            setErrorFlash(true);
            addTimeout(() => setErrorFlash(false), 150);
            setScore(s => Math.max(0, s - 5));
          }
        } else {
          // No target, look for one
          // Find all words starting with this key
          const possibleTargets = words.filter(w => w.text.startsWith(key));
          if (possibleTargets.length > 0) {
            // Prioritize the one closest to the bottom (oldest spawn time)
            possibleTargets.sort((a, b) => a.spawnTime - b.spawnTime);
            const target = possibleTargets[0];
            setTargetedWordId(target.id);
            setInput(key);
            if (target.text === key) {
               // highly unlikely for 1-letter words, but just in case
               setScore(s => s + target.text.length * 10);
               setWords(prev => prev.filter(w => w.id !== target.id));
               setInput('');
               setTargetedWordId(null);
            }
          } else {
             // Wrong key (no word starts with this)
             setErrorFlash(true);
             addTimeout(() => setErrorFlash(false), 150);
             setScore(s => Math.max(0, s - 5));
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array, uses refs!

  const restart = () => {
    setWords([]);
    setInput('');
    setTargetedWordId(null);
    setScore(0);
    setHealth(3);
    setGameOver(false);
  };

  return (
    <div className={`${styles.gameContainer} ${damageFlash ? styles.damageFlash : ''}`}>
      <BackButton />
      
      <div className={styles.gameArea}>
        <div className={styles.hud}>
          <div className={styles.health}>Health: {'❤️'.repeat(Math.max(0, health))}</div>
          <div className={styles.score}>Score: {score}</div>
        </div>

        <div className={styles.playField}>
          {words.map(w => {
            const isTarget = w.id === targetedWordId;
            return (
              <div 
                key={w.id} 
                className={`${styles.word} ${isTarget ? styles.targeted : ''}`}
                style={{ 
                  left: `${w.x}%`, 
                  animationDuration: `${FALL_DURATION}ms` 
                }}
              >
                <span className={styles.typedPart}>{isTarget ? input : ''}</span>
                <span>{isTarget ? w.text.slice(input.length) : w.text}</span>
              </div>
            );
          })}

          <div className={styles.cityLine} />
        </div>

        <div className={`${styles.inputDisplay} ${errorFlash ? styles.errorFlash : ''}`}>
          {input || <span className={styles.placeholder}>_</span>}
        </div>

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <h2>Mainframe Breached!</h2>
            <p>You scored {score} points and earned {Math.floor(score / 2)} global XP!</p>
            <button onClick={restart} className={styles.restartBtn}>Reboot System</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingDefender;
