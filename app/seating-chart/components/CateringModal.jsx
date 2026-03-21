'use client';
import { getSeatFillColor, generateCateringText } from '../utils/geometry.js';

export default function CateringModal({
  showCatering,
  setShowCatering,
  tables,
  guests,
  menuStats,
  showToast,
  realTables,
}) {
  if (!showCatering) return null;

  return (
    <div className="sc-overlay" onClick={e=>e.target===e.currentTarget&&setShowCatering(false)}>
      <div className="sc-modal" style={{width:'480px',maxHeight:'80vh',overflowY:'auto'}}>
        <div className="modal-title">🍽️ Listă Catering</div>
        <p style={{fontSize:'0.75rem',color:'#7A7F99',marginBottom:'1rem'}}>Rezumat comenzi per masă pentru restaurant.</p>
        {realTables.map(t=>{
          const tg=guests.filter(g=>g.tableId===t.id);
          const mc=tg.reduce((acc,g)=>{acc[g.meniu]=(acc[g.meniu]||0)+1;return acc;},{});
          const fc=getSeatFillColor(tg.length,t.seats);
          return (
            <div key={t.id} style={{marginBottom:'0.8rem',padding:'0.7rem 0.9rem',background:'#FAF7F2',borderRadius:'10px',border:'1px solid #E8DDD0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.3rem'}}>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:'0.95rem',fontWeight:600,color:'#13172E'}}>{t.name}</span>
                <span style={{fontSize:'0.7rem',fontWeight:700,color:fc}}>{tg.length}/{t.seats}</span>
              </div>
              {Object.entries(mc).length>0
                ?Object.entries(mc).map(([m,c])=><div key={m} style={{fontSize:'0.72rem',color:'#7A7F99'}}>• {c}x {m}</div>)
                :<div style={{fontSize:'0.72rem',color:'#9DA3BC',fontStyle:'italic'}}>Masă goală</div>
              }
            </div>
          );
        })}
        <div style={{marginTop:'0.5rem',padding:'0.7rem 0.9rem',background:'#13172E',borderRadius:'10px'}}>
          <div style={{fontSize:'0.65rem',color:'#9DA3BC',marginBottom:'0.4rem',textTransform:'uppercase',letterSpacing:'0.08em'}}>Total comenzi</div>
          {Object.entries(menuStats).map(([m,c])=>(
            <div key={m} style={{fontSize:'0.75rem',color:'#FAF7F2',display:'flex',justifyContent:'space-between'}}>
              <span>{m}</span><strong>{c}</strong>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'0.5rem',marginTop:'1rem'}}>
          <button className="conf-cancel" onClick={()=>setShowCatering(false)}>Închide</button>
          <button className="conf-ok" onClick={()=>{
            const blob=new Blob([generateCateringText(tables,guests)],{type:'text/plain;charset=utf-8'});
            const url=URL.createObjectURL(blob);
            const a=document.createElement('a');a.href=url;a.download='catering-plan.txt';a.click();
            URL.revokeObjectURL(url);showToast('Listă descărcată!','green');
          }}>⬇️ Descarcă .txt</button>
        </div>
      </div>
    </div>
  );
}