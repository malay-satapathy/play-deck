import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './TypingDefender.module.css';

const DICTIONARY = [
  'function', 'variable', 'component', 'react', 'promise', 'async', 'await', 
  'boolean', 'string', 'number', 'array', 'object', 'interface', 'class', 
  'export', 'import', 'default', 'return', 'console', 'window', 'document'
];

interface Word {
  id: number;
  text: string;
  x: number;
  y: number;
}

const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
const FALL_SPEED = 1;

const TypingDefender: React.FC = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  
  const { addXp } = useGlobalState();
  const requestRef = useRef<number>(0);
  const idCounter = useRef(0);

  const spawnWord = useCallback(() => {
    const text = DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)];
    const x = Math.random() * (GAME_WIDTH - 150) + 20; // keep in bounds
    setWords(prev => [...prev, { id: idCounter.current++, text, x, y: -50 }]);
  }, []);

  const gameLoop = useCallback(() => {
    if (gameOver) return;

    setWords(prevWords => {
      let missed = 0;
      const nextWords = prevWords.map(w => ({ ...w, y: w.y + FALL_SPEED })).filter(w => {
        if (w.y > GAME_HEIGHT) {
          missed++;
          return false;
        }
        return true;
      });

      if (missed > 0) {
        setHealth(h => {
          const newH = h - missed;
          if (newH <= 0) {
            setGameOver(true);
            addXp(Math.floor(score / 2));
          }
          return newH;
        });
      }

      return nextWords;
    });

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameOver, score, addXp]);

  useEffect(() => {
    if (gameOver) return;
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameLoop, gameOver]);

  // Spawner interval
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(spawnWord, 2000);
    return () => clearInterval(interval);
  }, [spawnWord, gameOver]);

  // Typing logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
        return;
      }
      if (e.key === 'Escape') {
        setInput('');
        return;
      }
      if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        const nextInput = (input + e.key).toLowerCase();
        
        const wordToDestroy = words.find(w => w.text === nextInput);
        if (wordToDestroy) {
          setInput(''); // Clear input explicitly
          setScore(s => s + wordToDestroy.text.length * 10);
          setWords(prev => prev.filter(w => w.id !== wordToDestroy.id));
        } else {
          setInput(nextInput);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, words, gameOver]);

  const restart = () => {
    setWords([]);
    setInput('');
    setScore(0);
    setHealth(3);
    setGameOver(false);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameArea}>
        <div className={styles.hud}>
          <div className={styles.health}>Health: {'❤️'.repeat(Math.max(0, health))}</div>
          <div className={styles.score}>Score: {score}</div>
        </div>

        <div className={styles.playField} style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
          {words.map(w => {
            const isTarget = input.length > 0 && w.text.startsWith(input);
            return (
              <div 
                key={w.id} 
                className={styles.word} 
                style={{ left: w.x, top: w.y, border: isTarget ? '2px solid #10b981' : 'none' }}
              >
                <span className={styles.typedPart}>{isTarget ? input : ''}</span>
                <span>{isTarget ? w.text.slice(input.length) : w.text}</span>
              </div>
            );
          })}

          <div className={styles.cityLine} />
        </div>

        <div className={styles.inputDisplay}>
          {input || 'Type to defend...'}
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
