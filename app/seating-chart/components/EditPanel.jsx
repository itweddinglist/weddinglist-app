'use client';

const LIMITS = {
  round:    { min: 4, max: 16, def: 8  },
  square:   { min: 4, max: 12, def: 4  },
  rect:     { min: 4, max: 20, def: 10 },
  prezidiu: { min: 4, max: 20, def: 8  },
  bar:      { min: 0, max: 0,  def: 0  },
};

export default function EditPanel({
  editPanel,
  setEditPanel,
  tables,
  editName,
  setEditName,
  editSeats,
  setEditSeats,
  saveEdit,
  deleteTable,
  rotateTable,
}) {
  if (!editPanel) return null;
  const t = tables.find(x => x.id === editPanel.tableId);
  if (!t) return null;
  const isRingEl = t.isRing;

  return (
    <div
      style={{position:'fixed',inset:0,zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(19,23,46,0.15)'}}
      onClick={() => setEditPanel(null)}
    >
      <div
        style={{
          position: 'relative',
          width: 300,
          background: '#1A1F3A',
          border: '1px solid rgba(201,144,122,0.25)',
          borderRadius: '16px',
          padding: '1.4rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'fadeUp 0.18s ease',
        }}
        onClick={e => e.stopPropagation()}
        >
        <button
          onClick={() => setEditPanel(null)}
          style={{position:'absolute',top:'0.8rem',right:'0.8rem',background:'none',border:'none',color:'#6E7490',cursor:'pointer',fontSize:'1.1rem',lineHeight:1,padding:'0.2rem'}}
        >×</button>
        <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.1rem',color:'#FAF7F2',marginBottom:'0.8rem',fontWeight:600}}>
          Editează {isRingEl ? 'ring-ul' : t.type === 'bar' ? 'obiectul' : 'masa'}
        </div>

        <label style={{fontSize:'0.55rem',textTransform:'uppercase',letterSpacing:'0.1em',color:'#6E7490',marginBottom:'0.25rem',display:'block'}}>Nume</label>
        <input
          style={{width:'100%',padding:'0.36rem 0.6rem',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'6px',fontFamily:'DM Sans,sans-serif',fontSize:'0.78rem',outline:'none',marginBottom:'0.8rem',color:'#FAF7F2',background:'rgba(255,255,255,0.07)',boxSizing:'border-box'}}
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveEdit()}
          autoFocus
        />

        {!isRingEl && t.type !== 'bar' && (
          <>
            <label style={{fontSize:'0.55rem',textTransform:'uppercase',letterSpacing:'0.1em',color:'#6E7490',marginBottom:'0.25rem',display:'block'}}>Locuri</label>
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.8rem'}}>
              <button style={{width:24,height:24,borderRadius:5,border:'1px solid rgba(255,255,255,0.15)',background:'none',cursor:'pointer',fontSize:'0.9rem',color:'#FAF7F2'}}
                onClick={() => setEditSeats(s => Math.max(LIMITS[t.type].min, s - 1))}>−</button>
              <span style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.1rem',color:'#FAF7F2',minWidth:22,textAlign:'center'}}>{editSeats}</span>
              <button style={{width:24,height:24,borderRadius:5,border:'1px solid rgba(255,255,255,0.15)',background:'none',cursor:'pointer',fontSize:'0.9rem',color:'#FAF7F2'}}
                onClick={() => setEditSeats(s => Math.min(LIMITS[t.type].max, s + 1))}>+</button>
              <span style={{marginLeft:'auto',fontSize:'0.6rem',color:'#6E7490'}}>{LIMITS[t.type].min}–{LIMITS[t.type].max}</span>
            </div>
          </>
        )}

        {(t.type === 'rect' || t.type === 'prezidiu' || t.type === 'bar') && !isRingEl && (
          <>
            <label style={{fontSize:'0.55rem',textTransform:'uppercase',letterSpacing:'0.1em',color:'#6E7490',marginBottom:'0.25rem',display:'block'}}>Rotație</label>
            <div style={{display:'flex',gap:'0.4rem',marginBottom:'0.8rem'}}>
              <button style={{flex:1,padding:'0.3rem',borderRadius:6,border:'1px solid rgba(255,255,255,0.15)',background:'none',fontFamily:'DM Sans,sans-serif',fontSize:'0.6rem',cursor:'pointer',color:'#9DA3BC'}}
                onClick={() => rotateTable(t.id, 90)}>↻ 90°</button>
              <button style={{flex:1,padding:'0.3rem',borderRadius:6,border:'1px solid rgba(255,255,255,0.15)',background:'none',fontFamily:'DM Sans,sans-serif',fontSize:'0.6rem',cursor:'pointer',color:'#9DA3BC'}}
                onClick={() => rotateTable(t.id, -90)}>↺ −90°</button>
            </div>
          </>
        )}

        <div style={{display:'flex',gap:'0.5rem',marginTop:'0.3rem'}}>
          <button style={{flex:1,padding:'0.4rem',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'#9DA3BC',fontFamily:'DM Sans,sans-serif',fontSize:'0.62rem',textTransform:'uppercase',letterSpacing:'0.05em',cursor:'pointer'}}
            onClick={() => setEditPanel(null)}>Anulează</button>
          <button style={{flex:1,padding:'0.4rem',borderRadius:6,border:'none',background:'#C9907A',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:'0.62rem',textTransform:'uppercase',letterSpacing:'0.05em',cursor:'pointer'}}
            onClick={saveEdit}>Salvează</button>
          <button style={{padding:'0.4rem 0.7rem',borderRadius:6,border:'1.5px solid #E53E3E',background:'rgba(229,62,62,0.1)',color:'#E53E3E',fontSize:'0.65rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}
            onClick={() => deleteTable(t.id)}>🗑 Șterge</button>
        </div>
      </div>
    </div>
  );
}