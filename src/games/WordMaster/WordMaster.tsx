import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './WordMaster.module.css';

const WORDS = [
  'REACT', 'GAMES', 'LOGIC', 'PIXEL', 'BLOCK', 'SPACE', 
  'LASER', 'ALIEN', 'GHOST', 'BOARD', 'SCORE', 'LEVEL',
  'POWER', 'MAGIC', 'NINJA', 'ROBOT', 'HEART', 'STARS'
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

const WordMaster: React.FC = () => {
  const [targetWord, setTargetWord] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();

  const initGame = useCallback(() => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(word);
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setWin(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleKeyPress = useCallback((key: string) => {
    if (gameOver || win) return;

    if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) return;
      
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      setCurrentGuess('');

      if (currentGuess === targetWord) {
        setWin(true);
        addXp(150);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameOver(true);
        addXp(20);
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else {
      if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
        setCurrentGuess(prev => prev + key);
      }
    }
  }, [currentGuess, guesses, targetWord, gameOver, win, addXp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleKeyPress('ENTER');
      else if (e.key === 'Backspace') handleKeyPress('BACKSPACE');
      else {
        const key = e.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  // Evaluates a single guess against the target word
  const evaluateGuess = (guess: string) => {
    const result = Array(WORD_LENGTH).fill('absent');
    const targetChars = targetWord.split('');
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
  };

  const getLetterStatus = (letter: string) => {
    let status = 'unused';
    guesses.forEach(guess => {
      const evaluation = evaluateGuess(guess);
      guess.split('').forEach((char, i) => {
        if (char === letter) {
          if (evaluation[i] === 'correct') status = 'correct';
          else if (evaluation[i] === 'present' && status !== 'correct') status = 'present';
          else if (evaluation[i] === 'absent' && status === 'unused') status = 'absent';
        }
      });
    });
    return status;
  };

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
            const guess = isCurrentRow ? currentGuess : guesses[rIndex] || '';
            const evaluation = guesses[rIndex] ? evaluateGuess(guesses[rIndex]) : [];

            return (
              <div key={rIndex} className={styles.row}>
                {Array.from({ length: WORD_LENGTH }).map((_, cIndex) => {
                  const letter = guess[cIndex] || '';
                  const status = evaluation[cIndex] || 'empty';
                  return (
                    <div 
                      key={cIndex} 
                      className={`${styles.cell} ${styles[status]} ${isCurrentRow && letter ? styles.active : ''}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {(gameOver || win) && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: win ? '#10b981' : '#ef4444' }}>
              {win ? 'MASTERED!' : 'OUT OF TRIES'}
            </h2>
            <p className={styles.targetReveal}>The word was: <strong>{targetWord}</strong></p>
            <p>XP Earned: {win ? '+150' : '+20'}</p>
            <button onClick={initGame} className={styles.restartBtn}>Play Again</button>
          </div>
        )}

        <div className={styles.keyboard}>
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className={styles.keyRow}>
              {row.map(key => {
                const status = key.length === 1 ? getLetterStatus(key) : 'action';
                return (
                  <button
                    key={key}
                    className={`${styles.key} ${styles['key-' + status]} ${key.length > 1 ? styles.actionKey : ''}`}
                    onClick={() => handleKeyPress(key)}
                  >
                    {key === 'BACKSPACE' ? '⌫' : key}
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
