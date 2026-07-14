import React from 'react';
import styles from './LoadingScreen.module.css';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loaderWrapper}>
        <Loader2 className={styles.spinner} size={64} />
        <h2 className={styles.loadingText}>INSERT COIN...</h2>
      </div>
    </div>
  );
};

export default LoadingScreen;
