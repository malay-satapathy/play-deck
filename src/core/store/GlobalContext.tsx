import React, { createContext, useContext, useState, useEffect } from 'react';

interface GlobalState {
  globalXp: number;
  level: number;
  addXp: (amount: number) => void;
}

const GlobalContext = createContext<GlobalState | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalXp, setGlobalXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);

  // Load from local storage on mount
  useEffect(() => {
    const savedXp = localStorage.getItem('playDeckXp');
    if (savedXp) {
      const xp = parseInt(savedXp, 10);
      setGlobalXp(xp);
      setLevel(Math.floor(xp / 1000) + 1);
    }
  }, []);

  const addXp = (amount: number) => {
    setGlobalXp(prev => {
      const newXp = prev + amount;
      localStorage.setItem('playDeckXp', newXp.toString());
      setLevel(Math.floor(newXp / 1000) + 1);
      return newXp;
    });
  };

  return (
    <GlobalContext.Provider value={{ globalXp, level, addXp }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalProvider');
  }
  return context;
};
