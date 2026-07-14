import React, { useState, useEffect, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './QuantumDice.module.css';

type PredictionType = number | 'EVEN' | 'ODD' | 'LOW' | 'HIGH';

const BET_AMOUNT = 10;

const QuantumDice: React.FC = () => {
  const [prediction, setPrediction] = useState<PredictionType | null>(null);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<'WIN' | 'LOSE' | null>(null);
  const [multiplier, setMultiplier] = useState(0);
  
  const { addXp, globalXp } = useGlobalState();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const handleAction = () => {
    if (!isRolling) {
      // Start Roll
      if (!prediction || globalXp < BET_AMOUNT) return;
      
      addXp(-BET_AMOUNT);
      setIsRolling(true);
      setResult(null);

      intervalRef.current = window.setInterval(() => {
        setDiceValue(prev => {
          let next = Math.floor(Math.random() * 6) + 1;
          if (next === prev) next = (next % 6) + 1;
          return next;
        });
      }, 100);
    } else {
      // Measure
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = null;

      const finalValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(finalValue);
      setIsRolling(false);
      
      let isWin = false;
      let mult = 0;

      if (typeof prediction === 'number' && finalValue === prediction) {
        isWin = true;
        mult = 6;
      } else if (prediction === 'EVEN' && finalValue % 2 === 0) {
        isWin = true;
        mult = 2;
      } else if (prediction === 'ODD' && finalValue % 2 !== 0) {
        isWin = true;
        mult = 2;
      } else if (prediction === 'LOW' && finalValue <= 3) {
        isWin = true;
        mult = 2;
      } else if (prediction === 'HIGH' && finalValue >= 4) {
        isWin = true;
        mult = 2;
      }

      setMultiplier(mult);

      if (isWin) {
        setResult('WIN');
        addXp(BET_AMOUNT * mult);
      } else {
        setResult('LOSE');
      }
    }
  };

  const getPredictionLabel = (p: PredictionType) => {
    if (typeof p === 'number') return p.toString();
    if (p === 'LOW') return '1-3';
    if (p === 'HIGH') return '4-6';
    return p;
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1>Quantum Dice</h1>
          <p>Superposition betting. Cost: 10 XP.</p>
          <p className={styles.xpText}>Your XP: {globalXp}</p>
        </div>

        <div className={styles.diceArea}>
          <div className={styles.scene}>
            <div className={`${styles.cube} ${!isRolling ? styles.settled : ''}`} data-value={diceValue}>
              <div className={`${styles.cubeFace} ${styles.cubeFaceFront}`}>1</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceBack}`}>6</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceRight}`}>3</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceLeft}`}>4</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceTop}`}>2</div>
              <div className={`${styles.cubeFace} ${styles.cubeFaceBottom}`}>5</div>
            </div>
          </div>
        </div>

        <div className={styles.resultBannerContainer}>
          {result && !isRolling && (
            <div className={`${styles.resultBanner} ${result === 'WIN' ? styles.win : styles.lose}`}>
              {result === 'WIN' ? `WAVEFORM COLLAPSED! +${BET_AMOUNT * multiplier} XP` : `WAVEFORM COLLAPSED: ${diceValue}. YOU LOSE.`}
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <h3>Select your superposition state:</h3>
          
          <div className={styles.bettingGrid}>
            <div className={styles.betGroup}>
              <h4>Exact (6x)</h4>
              <div className={styles.numberPad}>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button 
                    key={num}
                    className={`${styles.numBtn} ${prediction === num ? styles.selected : ''}`}
                    onClick={() => { if (!isRolling) { setPrediction(num); setResult(null); } }}
                    disabled={isRolling}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            
            <div className={styles.betGroup}>
              <h4>Probabilities (2x)</h4>
              <div className={styles.probPad}>
                {(['EVEN', 'ODD', 'LOW', 'HIGH'] as PredictionType[]).map(p => (
                  <button 
                    key={p}
                    className={`${styles.probBtn} ${prediction === p ? styles.selected : ''}`}
                    onClick={() => { if (!isRolling) { setPrediction(p); setResult(null); } }}
                    disabled={isRolling}
                  >
                    {getPredictionLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            className={`${styles.rollBtn} ${isRolling ? styles.measureBtn : ''}`}
            onClick={handleAction}
            disabled={(!isRolling && (!prediction || globalXp < BET_AMOUNT))}
          >
            {isRolling ? 'MEASURE!' : (globalXp < BET_AMOUNT ? 'NOT ENOUGH XP' : 'ENTER SUPERPOSITION')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantumDice;
