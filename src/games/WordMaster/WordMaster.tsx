import React, { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './WordMaster.module.css';
import { Delete } from 'lucide-react';

const WORDS = [
  'REACT', 'GAMES', 'LOGIC', 'PIXEL', 'BLOCK', 'SPACE', 
  'LASER', 'ALIEN', 'GHOST', 'BOARD', 'SCORE', 'LEVEL',
  'POWER', 'MAGIC', 'NINJA', 'ROBOT', 'HEART', 'STARS',
  'WORLD', 'SUPER', 'MARIO', 'SONIC', 'ZELDA', 'SMASH',
  'FIGHT', 'BRAWL', 'MELEE', 'SPEED', 'RACER', 'TRACK',
  'DRIFT', 'TURBO', 'BOOST', 'CLIMB', 'JUMP', 'SHOOT',
  'SNAKE', 'FRUIT', 'CANDY', 'CRUSH', 'MATCH', 'PUZZL', // PUZZL -> PUZZLE? 5 letters!
  'CHESS', 'POKER', 'CARDS', 'BINGO', 'LOTTO', 'PRIZE',
  'TRAIN', 'PLANE', 'TRUCK', 'OCEAN', 'RIVER', 'WATER'
];
const VALID_WORDS = new Set(WORDS);

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

type KeyStatus = 'correct' | 'present' | 'absent' | 'unused';

const WordMaster: React.FC = () => {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [keyboardState, setKeyboardState] = useState<Record<string, KeyStatus>>({});
  const [isShaking, setIsShaking] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  
  const { addXp } = useGlobalState();
  const isProcessingRef = useRef(false);
  const restartBtnRef = useRef<HTMLButtonElement>(null);

  const initGame = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(word);
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setWin(false);
    setKeyboardState({});
    isProcessingRef.current = false;
    
    // Clear focus from restart button
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Evaluates a single guess against the target word
  const evaluateGuess = useCallback((guess: string, target: string) => {
    const result = Array(WORD_LENGTH).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');

    // Exact matches
    guessChars.forEach((char, i) => {
      if (char === targetChars[i]) {
        result[i] = 'correct';
        targetChars[i] = null as any; 
      }
    });

    // Partial matches
    guessChars.forEach((char, i) => {
      if (result[i] === 'correct') return;
      const targetIndex = targetChars.indexOf(char);
      if (targetIndex > -1) {
        result[i] = 'present';
        targetChars[targetIndex] = null as any;
      }
    });

    return result;
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    if (gameOver || win || isRevealing || isProcessingRef.current) return;

    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }
      
      if (!VALID_WORDS.has(currentGuess)) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }
      
      isProcessingRef.current = true;
      setIsRevealing(true);
      
      const newGuesses = [...guesses, currentGuess];
      const evaluation = evaluateGuess(currentGuess, targetWord);
      
      // Reveal animation takes WORD_LENGTH * 300ms
      setTimeout(() => {
        setGuesses(newGuesses);
        
        // Update keyboard state
        setKeyboardState(prev => {
          const next = { ...prev };
          currentGuess.split('').forEach((char, i) => {
            const status = evaluation[i];
            if (status === 'correct') next[char] = 'correct';
            else if (status === 'present' && next[char] !== 'correct') next[char] = 'present';
            else if (status === 'absent' && next[char] !== 'correct' && next[char] !== 'present') next[char] = 'absent';
          });
          return next;
        });

        setCurrentGuess('');
        setIsRevealing(false);
        isProcessingRef.current = false;

        if (currentGuess === targetWord) {
          setWin(true);
          addXp(150);
        } else if (newGuesses.length >= MAX_GUESSES) {
          setGameOver(true);
          addXp(20);
        }
      }, WORD_LENGTH * 300); // Wait for animations to finish
      
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else {
      if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess(prev => prev + key);
      }
    }
  }, [currentGuess, guesses, targetWord, gameOver, win, addXp, isRevealing, evaluateGuess]);

  // Use a ref for the latest handleKeyPress to avoid effect thrashing
  const handleKeyPressRef = useRef(handleKeyPress);
  useEffect(() => {
    handleKeyPressRef.current = handleKeyPress;
  }, [handleKeyPress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keydown if focus is on the restart button (it will fire onClick anyway)
      if (document.activeElement === restartBtnRef.current && e.key === 'Enter') return;
      
      if (e.key === 'Enter') handleKeyPressRef.current('ENTER');
      else if (e.key === 'Backspace') handleKeyPressRef.current('BACKSPACE');
      else {
        const key = e.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) handleKeyPressRef.current(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const KEYBOARD_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','BACKSPACE']
  ];

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Word-Master</h2>
        </div>

        <div className={styles.grid}>
          {Array.from({ length: MAX_GUESSES }).map((_, rIndex) => {
            const isCurrentRow = rIndex === guesses.length;
            const guess = isCurrentRow ? currentGuess : (guesses[rIndex] || '');
            const isRevealed = rIndex < guesses.length;
            
            // If this is the current row and we are revealing it, calculate its evaluation
            const isRowRevealing = isCurrentRow && isRevealing;
            const evaluation = (isRevealed || isRowRevealing) ? evaluateGuess(guess, targetWord) : [];

            return (
              <div 
                key={rIndex} 
                className={`${styles.row} ${isCurrentRow && isShaking ? styles.shake : ''}`}
              >
                {Array.from({ length: WORD_LENGTH }).map((_, cIndex) => {
                  const letter = guess[cIndex] || '';
                  const status = evaluation[cIndex] || 'empty';
                  const flipDelay = cIndex * 0.3; // seconds
                  
                  return (
                    <div 
                      key={cIndex} 
                      className={`${styles.cellContainer}`}
                    >
                      <div 
                        className={`
                          ${styles.cell} 
                          ${isRevealed ? styles[status] : ''} 
                          ${isRowRevealing ? styles.flipping : ''}
                          ${isCurrentRow && letter && !isRevealing ? styles.active : ''}
                        `}
                        style={{ 
                          animationDelay: `${flipDelay}s`,
                          // During reveal, we want the color to change halfway through the flip
                        }}
                      >
                        <div className={styles.cellInner} style={{ animationDelay: `${flipDelay}s` }}>
                          <div className={styles.cellFront}>{letter}</div>
                          <div className={`${styles.cellBack} ${styles[status]}`}>{letter}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <div className={styles.gameOverModal}>
              <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
                {win ? 'MASTERED!' : 'OUT OF TRIES'}
              </h2>
              <p className={styles.targetReveal}>The word was: <strong>{targetWord}</strong></p>
              <p>XP Earned: {win ? '+150' : '+20'}</p>
              <button ref={restartBtnRef} onClick={initGame} className={styles.restartBtn}>Play Again</button>
            </div>
          </div>
        )}

        <div className={styles.keyboard}>
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className={styles.keyRow}>
              {row.map(key => {
                const status = key.length === 1 ? (keyboardState[key] || 'unused') : 'action';
                return (
                  <button
                    key={key}
                    className={`
                      ${styles.key} 
                      ${styles['key-' + status]} 
                      ${key === 'ENTER' ? styles.enterKey : ''}
                      ${key === 'BACKSPACE' ? styles.backspaceKey : ''}
                    `}
                    onClick={() => {
                      // Call handleKeyPress Ref so it works exactly like physical keyboard
                      handleKeyPressRef.current(key);
                      // Blur button so physical enter doesn't double trigger
                      if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                      }
                    }}
                  >
                    {key === 'BACKSPACE' ? <Delete size={20} /> : (key === 'ENTER' ? 'ENTER' : key)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordMaster;
