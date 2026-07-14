import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: '#f8fafc',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        fontWeight: 600,
        transition: 'all 0.2s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateX(-5px)')}
      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateX(0)')}
    >
      <ArrowLeft size={20} />
      <span>Back to Hub</span>
    </button>
  );
};

export default BackButton;
