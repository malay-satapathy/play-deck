import React, { useState, useEffect, useRef } from 'react';
import BackButton from '../../core/components/BackButton';
import { useGlobalState } from '../../core/store/GlobalContext';
import styles from './CosmicMiner.module.css';
import { Pickaxe, Settings, ChevronUp, Gem, Rocket } from 'lucide-react';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  value: number;
}

const CosmicMiner: React.FC = () => {
  const [minerals, setMinerals] = useState(0);
  const [miners, setMiners] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [stations, setStations] = useState(0); // Tier 3
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  
  const { addXp } = useGlobalState();
  const textIdCounter = useRef(0);

  const minerCost = Math.floor(10 * Math.pow(1.15, miners));
  const clickUpgradeCost = Math.floor(50 * Math.pow(1.5, clickPower - 1));
  const stationCost = Math.floor(500 * Math.pow(1.2, stations));

  const mineralsPerSec = miners * 1 + stations * 25;

  useEffect(() => {
    const interval = setInterval(() => {
      if (mineralsPerSec > 0) {
        setMinerals(m => m + mineralsPerSec);
        if (Math.random() < 0.05 * mineralsPerSec) {
          addXp(1);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mineralsPerSec, addXp]);

  const handleAsteroidClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setMinerals(m => m + clickPower);
    if (Math.random() < 0.1) addXp(1);

    // Floating text logic
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const id = textIdCounter.current++;
    setFloatingTexts(prev => [...prev, { id, x, y, value: clickPower }]);
    
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  const buyMiner = () => {
    if (minerals >= minerCost) {
      setMinerals(m => m - minerCost);
      setMiners(m => m + 1);
    }
  };

  const upgradeClick = () => {
    if (minerals >= clickUpgradeCost) {
      setMinerals(m => m - clickUpgradeCost);
      setClickPower(c => c + 1);
    }
  };

  const buyStation = () => {
    if (minerals >= stationCost) {
      setMinerals(m => m - stationCost);
      setStations(s => s + 1);
    }
  };

  return (
    <div className={styles.gameContainer}>
      <BackButton />
      
      <div className={styles.dashboard}>
        <div className={styles.leftColumn}>
          <div className={styles.statsPanel}>
            <div className={styles.statHeader}>
              <Gem size={32} color="#a78bfa" />
              <h2>Cosmic Resources</h2>
            </div>
            <div className={styles.mineralCount}>
              {Math.floor(minerals).toLocaleString()}
            </div>
            <div className={styles.rates}>
              <div className={styles.rateItem}>
                <span>Per Second:</span>
                <span className={styles.rateValue}>{mineralsPerSec}/s</span>
              </div>
              <div className={styles.rateItem}>
                <span>Per Click:</span>
                <span className={styles.rateValue}>{clickPower}</span>
              </div>
            </div>
          </div>

          <div className={styles.upgradesPanel}>
            <h3><Settings size={20} /> Tech Tree</h3>
            
            <button 
              className={styles.upgradeCard} 
              onClick={upgradeClick} 
              disabled={minerals < clickUpgradeCost}
            >
              <div className={styles.upgradeInfo}>
                <h4>Laser Drill (Lvl {clickPower})</h4>
                <p>+1 mineral per click.</p>
              </div>
              <div className={styles.upgradeCost}>
                <span>Cost: {clickUpgradeCost}</span>
                <Pickaxe size={24} />
              </div>
            </button>

            <button 
              className={styles.upgradeCard} 
              onClick={buyMiner} 
              disabled={minerals < minerCost}
            >
              <div className={styles.upgradeInfo}>
                <h4>Auto-Drone ({miners})</h4>
                <p>+1 mineral every second.</p>
              </div>
              <div className={styles.upgradeCost}>
                <span>Cost: {minerCost}</span>
                <ChevronUp size={24} />
              </div>
            </button>

            <button 
              className={styles.upgradeCard} 
              onClick={buyStation} 
              disabled={minerals < stationCost}
            >
              <div className={styles.upgradeInfo}>
                <h4>Orbital Station ({stations})</h4>
                <p>+25 minerals every second.</p>
              </div>
              <div className={styles.upgradeCost}>
                <span>Cost: {stationCost}</span>
                <Rocket size={24} />
              </div>
            </button>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.asteroidArea}>
            <div className={styles.orbitContainer}>
              <button 
                className={styles.asteroidBtn} 
                onClick={handleAsteroidClick}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div className={styles.asteroidGraphic} />
                
                {floatingTexts.map(text => (
                  <div 
                    key={text.id} 
                    className={styles.floatingText}
                    style={{ left: text.x, top: text.y }}
                  >
                    +{text.value}
                  </div>
                ))}
              </button>

              {/* Render visual orbiting drones (max 20 to save DOM) */}
              {Array.from({ length: Math.min(miners, 20) }).map((_, i) => (
                <div 
                  key={i} 
                  className={styles.orbitingDrone} 
                  style={{ animationDelay: `${-(i * 0.5)}s` }}
                />
              ))}

              {/* Render visual orbital stations */}
              {Array.from({ length: Math.min(stations, 5) }).map((_, i) => (
                <div 
                  key={i} 
                  className={styles.orbitingStation} 
                  style={{ animationDelay: `${-(i * 1.5)}s` }}
                >
                  🛰️
                </div>
              ))}
            </div>
            
            <p className={styles.instructionText}>Click the asteroid to mine!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CosmicMiner;
