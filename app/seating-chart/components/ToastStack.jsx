'use client';

const toastColors = {
  rose:   '#C9907A',
  green:  '#48BB78',
  red:    '#E53E3E',
  yellow: '#ECC94B',
};

export default function ToastStack({ toasts }) {
  return (
    <div style={{position:'fixed',bottom:'1.5rem',right:'1.5rem',display:'flex',flexDirection:'column',gap:'0.5rem',zIndex:10000,pointerEvents:'none'}}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background:'#1A1F3A',
            color:'#FAF7F2',
            padding:'0.55rem 1rem',
            borderRadius:'10px',
            fontSize:'0.72rem',
            boxShadow:'0 6px 24px rgba(0,0,0,0.25)',
            borderLeft:`3px solid ${toastColors[t.type] || '#C9907A'}`,
            animation:'fadeUp 0.3s ease',
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}