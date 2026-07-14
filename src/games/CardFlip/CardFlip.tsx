import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const getSymbolColor = (symbol: string) => {
  if (symbol === '♥' || symbol === '♦' || symbol === '🔥') return '#ef4444'; // Red
  if (symbol === '⚡' || symbol === '★') return '#eab308'; // Yellow
  if (symbol === '💎') return '#22d3ee'; // Cyan
  return '#f8fafc'; // White
};

const CardFlip: React.FC = () => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [win, setWin] = useState(false);
  
  const { addXp } = useGlobalState();
  const isProcessingRef = useRef(false);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return () => clearTimeouts();
  }, []);

  const initGame = useCallback(() => {
    clearTimeouts();
    isProcessingRef.current = false;
    
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
    if (isProcessingRef.current || flippedIds.length >= 2) return;
    
    const clickedCard = cards.find(c => c.id === id);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));

    const newFlippedIds = [...flippedIds, id];
    setFlippedIds(newFlippedIds);

    if (newFlippedIds.length === 2) {
      isProcessingRef.current = true;
      setMoves(m => m + 1);
      
      const id1 = newFlippedIds[0];
      const id2 = newFlippedIds[1];
      const card1 = cards.find(c => c.id === id1)!;
      
      if (card1.symbol === clickedCard.symbol) {
        // Match
        const t = setTimeout(() => {
          setCards(prev => {
            const matched = prev.map(c => 
              (c.id === id1 || c.id === id2) ? { ...c, isMatched: true } : c
            );
            
            // Check win
            if (matched.every(c => c.isMatched)) {
              setWin(true);
              addXp(100);
            }
            return matched;
          });
          setFlippedIds([]);
          isProcessingRef.current = false;
        }, 500);
        timeoutRefs.current.push(t);
      } else {
        // No match
        const t = setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === id1 || c.id === id2) ? { ...c, isFlipped: false } : c
          ));
          setFlippedIds([]);
          isProcessingRef.current = false;
        }, 1000);
        timeoutRefs.current.push(t);
      }
    }
  };

  const pairsMatched = cards.filter(c => c.isMatched).length / 2;
  const totalPairs = SYMBOLS.length;

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.gameBoard}>
        <div className={styles.header}>
          <h2>Card-Flip</h2>
          <div className={styles.stats}>
            <span>Moves: {moves}</span>
            <span>Pairs: {pairsMatched} / {totalPairs}</span>
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
