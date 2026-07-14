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
}

const DeckCard: React.FC<DeckCardProps> = ({ id, name, description, gradient, icon, suit, rank, color }) => {
  const navigate = useNavigate();

  return (
    <div 
      className={`${styles.deckCard} glass-panel`}
      onClick={() => navigate(`/game/${id}`)}
      style={{ '--suit-color': color } as React.CSSProperties}
    >
      <div className={styles.cardCorner} style={{ top: 12, left: 12 }}>
        <span className={styles.cardRank}>{rank}</span>
        <span className={styles.cardSuit}>{suit}</span>
      </div>

      <div className={styles.cardCorner} style={{ bottom: 12, right: 12, transform: 'rotate(180deg)' }}>
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
