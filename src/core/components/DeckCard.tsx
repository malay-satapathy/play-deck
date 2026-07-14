import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../pages/Hub/Hub.module.css';

interface DeckCardProps {
  id: string;
  name: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
  suit: string;
  rank: string;
  color: string;
  index: number;
  activeIndex: number;
  onClick: () => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ 
  id, name, description, gradient, icon, suit, rank, color, index, activeIndex, onClick 
}) => {
  const navigate = useNavigate();
  
  const isActive = index === activeIndex;
  const offset = index - activeIndex;

  const handleClick = () => {
    if (isActive) {
      navigate(`/game/${id}`);
    } else {
      onClick();
    }
  };

  // 3D Transform calculations
  let transform = '';
  let opacity = 1;
  let zIndex = 50 - Math.abs(offset);

  if (isActive) {
    transform = 'translateX(0px) translateZ(150px) scale(1.1)';
  } else {
    const sign = Math.sign(offset);
    const absOffset = Math.abs(offset);
    // Spacing between cards: 140px, pushed back: 100px per step, rotated 35deg
    transform = `translateX(${offset * 140}px) translateZ(${absOffset * -100}px) rotateY(${sign * -35}deg)`;
    opacity = Math.max(1 - (absOffset * 0.15), 0); 
  }

  // Optimize rendering by fully hiding cards that are very far away
  if (Math.abs(offset) > 5) {
    opacity = 0;
    // push it way off screen
    transform = `translateX(${Math.sign(offset) * 2000}px)`;
  }

  return (
    <div 
      className={`${styles.deckCard} ${isActive ? styles.activeCard : ''}`}
      onClick={handleClick}
      style={{ 
        '--suit-color': color, 
        transform,
        zIndex,
        opacity,
        pointerEvents: Math.abs(offset) > 3 ? 'none' : 'auto'
      } as React.CSSProperties}
    >
      <div className={styles.cardCorner} style={{ top: 16, left: 16 }}>
        <span className={styles.cardRank}>{rank}</span>
        <span className={styles.cardSuit}>{suit}</span>
      </div>

      <div className={styles.cardCorner} style={{ bottom: 16, right: 16, transform: 'rotate(180deg)' }}>
        <span className={styles.cardRank}>{rank}</span>
        <span className={styles.cardSuit}>{suit}</span>
      </div>

      <div className={styles.cardCenter}>
        <div className={styles.cardGraphic} style={{ background: gradient }}>
          {icon}
        </div>
      </div>

      <div className={styles.cardContent}>
        <h3>{name}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default DeckCard;
