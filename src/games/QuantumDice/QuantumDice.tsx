import React, { useState, useEffect } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './QuantumDice.module.css';

const QuantumDice: React.FC = () => {
  const [prediction, setPrediction] = useState<number | null>(null);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<'WIN' | 'LOSE' | null>(null);
  
  const { addXp } = useGlobalState();

  const handleRoll = () => {
    if (!prediction || isRolling) return;
    
    setIsRolling(true);
    setResult(null);

    // CSS Animation takes 2 seconds
    setTimeout(() => {
      const finalValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(finalValue);
      setIsRolling(false);
      
      if (finalValue === prediction) {
        setResult('WIN');
        addXp(50); // Big reward for 1/6 chance!
      } else {
        setResult('LOSE');
      }
    }, 2000);
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1>Quantum Dice</h1>
          <p>Predict the outcome. High risk, high reward.</p>
        </div>

        <div className={styles.diceArea}>
          <div className={`${styles.scene} ${isRolling ? styles.rolling : ''}`}>
            <div className={styles.cube} data-value={isRolling ? 'rolling' : diceValue}>
              <div className={`${styles.cubeFace} ${styles.cubeFaceFront}`}>1</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceBack}`}>6</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceRight}`}>3</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceLeft}`}>4</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceTop}`}>2</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceBottom}`}>5</div>
            </div>
          </div>
        </div>

        {result && !isRolling && (
          <div className={`${styles.resultBanner} ${result === 'WIN' ? styles.win : styles.lose}`}>
            {result === 'WIN' ? 'PREDICTION CORRECT! +50 XP' : `WRONG! It was a ${diceValue}.`}
          </div>
        )}

        <div className={styles.controls}>
          <h3>Select your prediction:</h3>
          <div className={styles.numberPad}>
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button 
                key={num}
                className={`${styles.numBtn} ${prediction === num ? styles.selected : ''}`}
                onClick={() => {
                  if (!isRolling) {
                    setPrediction(num);
                    setResult(null);
                  }
                }}
                disabled={isRolling}
              >
                {num}
              </button>
            ))}
          </div>

          <button 
            className={styles.rollBtn}
            onClick={handleRoll}
            disabled={!prediction || isRolling}
          >
            {isRolling ? 'Rolling...' : 'INITIATE ROLL'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantumDice;
