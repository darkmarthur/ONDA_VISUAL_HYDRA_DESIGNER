'use client';

import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with React Flow and Hydra
const HydraEditor=dynamic(() => import('../components/HydraEditor'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#050505',
        color: '#f4f4f5',
        fontFamily: "'Inter', sans-serif",
        fontSize: '11px',
        letterSpacing: '2px',
        textTransform: 'uppercase',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontStyle: 'normal', fontSize: '24px', marginBottom: '12px', opacity: 0.8 }}>◌</div>
        <div style={{ opacity: 0.5 }}>ONDA｜HYDRA</div>
      </div>
    </div>
  ),
});

export default function Page() {
  return <HydraEditor />;
}
