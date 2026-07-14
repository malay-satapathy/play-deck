import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './CardFlip.module.css';

const SYMBOLS = ['♠', '♥', '♦', '♣', '★', '⚡', '🔥', '💎'];

type CardState = {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const CardFlip: React.FC = () => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();

  const initGame = useCallback(() => {
    const deck = [...SYMBOLS, ...SYMBOLS];
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck.map((s, i) => ({
      id: i,
      symbol: s,
      isFlipped: false,
      isMatched: false
    })));
    setFlippedIds([]);
    setMoves(0);
    setWin(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCardClick = (id: number) => {
    if (flippedIds.length >= 2) return; // Prevent clicking more than 2
    if (cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlippedIds = [...flippedIds, id];
    setFlippedIds(newFlippedIds);

    if (newFlippedIds.length === 2) {
      setMoves(m => m + 1);
      
      const [id1, id2] = newFlippedIds;
      if (newCards[id1].symbol === newCards[id2].symbol) {
        // Match
        setTimeout(() => {
          setCards(prev => {
            const matched = [...prev];
            matched[id1].isMatched = true;
            matched[id2].isMatched = true;
            
            // Check win
            if (matched.every(c => c.isMatched)) {
              setWin(true);
              addXp(100);
            }
            return matched;
          });
          setFlippedIds([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => {
            const flippedBack = [...prev];
            flippedBack[id1].isFlipped = false;
            flippedBack[id2].isFlipped = false;
            return flippedBack;
          });
          setFlippedIds([]);
        }, 1000);
      }
    }
  };

  const getSymbolColor = (symbol: string) => {
    if (symbol === '♥' || symbol === '♦' || symbol === '🔥') return '#ef4444'; // Red
    if (symbol === '⚡' || symbol === '★') return '#eab308'; // Yellow
    if (symbol === '💎') return '#22d3ee'; // Cyan
    return '#f8fafc'; // White
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Card-Flip</h2>
          <div className={styles.stats}>
            <span>Moves: {moves}</span>
          </div>
        </div>

        <div className={styles.grid}>
          {cards.map((card) => (
            <div 
              key={card.id} 
              className={`${styles.card} ${card.isFlipped ? styles.flipped : ''} ${card.isMatched ? styles.matched : ''}`}
              onClick={() => handleCardClick(card.id)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardFront}>
                  {/* Card Back Design */}
                  <div className={styles.pattern} />
                </div>
                <div className={styles.cardBack}>
                  <span style={{ color: getSymbolColor(card.symbol) }}>
                    {card.symbol}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {win && (
          <div className={styles.gameOverOverlay}>
            <h2 style={{ color: '#10b981' }}>ALL MATCHED!</h2>
            <p>Moves taken: {moves}</p>
            <p>XP Earned: +100</p>
            <button onClick={initGame} className={styles.restartBtn}>Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardFlip;
