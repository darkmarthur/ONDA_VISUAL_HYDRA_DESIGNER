'use client';

import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with React Flow and Hydra
const HydraEditor = dynamic(() => import('../components/HydraEditor'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0f',
        color: '#6366f1',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
        letterSpacing: '2px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.5))' }}>◈</div>
        <div>LOADING HYDRA DESIGNER...</div>
      </div>
    </div>
  ),
});

export default function Page() {
  return <HydraEditor />;
}
