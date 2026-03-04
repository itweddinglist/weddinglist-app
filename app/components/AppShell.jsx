'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MODULES = [
  { id: 'dashboard',     icon: '📊', label: 'Dashboard',     path: '/dashboard' },
  { id: 'seating-chart', icon: '🪑', label: 'Plan Mese',      path: '/seating-chart' },
  { id: 'guest-list',    icon: '👥', label: 'Listă Invitați', path: '/guest-list' },
  { id: 'budget',        icon: '💰', label: 'Buget',          path: '/budget' },
  { id: 'checklist',     icon: '✅', label: 'Checklist',      path: '/checklist' },
  { id: 'timeline',      icon: '⏰', label: 'Timeline',       path: '/timeline' },
  { id: 'vendors',       icon: '🤝', label: 'Furnizori',      path: '/vendors' },
  { id: 'gift-registry', icon: '🎁', label: 'Wishlist',       path: '/gift-registry' },
  { id: 'moodboard',     icon: '🖼️', label: 'Moodboard',      path: '/moodboard' },
  { id: 'notes',         icon: '📝', label: 'Notițe',         path: '/notes' },
  { id: 'export',        icon: '📄', label: 'Export',         path: '/export' },
  { id: 'settings',      icon: '⚙️', label: 'Setări',         path: '/settings' },
];

const WEDDING = {
  mire: 'Alexandru',
  mireasa: 'Andreea',
  data: new Date('2026-09-15'),
};

function getDaysLeft(date) {
  const diff = date - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const NO_SHELL = ['/'];

export default function AppShell({ children }) {
  const pathname = usePathname();

  if (NO_SHELL.includes(pathname)) {
    return <>{children}</>;
  }

  const daysLeft = getDaysLeft(WEDDING.data);

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>

      {/* NAV */}
      <nav style={{
        background: 'var(--navy)',
        position: 'fixed', top:0, left:0, right:0,
        height: '64px', zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '0 2rem',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(201,144,122,0.15)',
      }}>
        <Link href="/dashboard" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.4rem', fontWeight: 300,
          color: '#FAF7F2', textDecoration: 'none',
          letterSpacing: '0.05em',
        }}>
          wedding<em style={{ color:'var(--rose)', fontStyle:'italic' }}>list</em>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.68rem', color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s ease infinite' }} />
            Salvat
          </div>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--rose)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', color:'white', fontWeight:500, cursor:'pointer' }}>
            {WEDDING.mireasa[0]}{WEDDING.mire[0]}
          </div>
        </div>
      </nav>

      <div style={{ display:'flex', paddingTop:'64px', minHeight:'100vh' }}>

        {/* SIDEBAR */}
        <aside style={{
          width: '260px',
          background: 'var(--navy-card)',
          position: 'fixed',
          top: '64px', left:0, bottom:0,
          overflowY: 'auto',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          padding: '1.5rem 0',
        }}>
          {/* Mirii + countdown */}
          <div style={{ padding:'0 1.5rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.05)', marginBottom:'1rem' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'#FAF7F2', marginBottom:'0.2rem' }}>
              {WEDDING.mireasa} & {WEDDING.mire}
            </div>
            <div style={{ fontSize:'0.72rem', color:'var(--muted)' }}>
              {WEDDING.data.toLocaleDateString('ro-RO', { day:'numeric', month:'long', year:'numeric' })}
            </div>
            <div style={{ marginTop:'0.8rem', background:'rgba(201,144,122,0.1)', border:'1px solid rgba(201,144,122,0.2)', borderRadius:'8px', padding:'0.6rem', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', color:'var(--rose)', lineHeight:1 }}>
                {daysLeft}
              </div>
              <div style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)' }}>
                zile rămase
              </div>
            </div>
          </div>

          {/* Module */}
          <span style={{ fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--muted)', padding:'0 1.5rem', marginBottom:'0.5rem', display:'block' }}>
            Module
          </span>
          {MODULES.map(m => {
            const isActive = pathname === m.path;
            return (
              <Link key={m.id} href={m.path} style={{
                display:'flex', alignItems:'center', gap:'0.8rem',
                padding:'0.7rem 1.5rem',
                fontSize:'0.82rem',
                color: isActive ? 'var(--rose)' : 'var(--muted)',
                background: isActive ? 'rgba(201,144,122,0.08)' : 'transparent',
                borderLeft: `3px solid ${isActive ? 'var(--rose)' : 'transparent'}`,
                textDecoration:'none',
                transition:'all 0.2s',
              }}>
                <span style={{ fontSize:'1rem', width:'20px', textAlign:'center' }}>{m.icon}</span>
                {m.label}
                {m.id === 'guest-list' && (
                  <span style={{ marginLeft:'auto', background:'var(--rose)', color:'white', fontSize:'0.6rem', padding:'0.1rem 0.4rem', borderRadius:'10px' }}>12</span>
                )}
              </Link>
            );
          })}
        </aside>

        {/* MAIN */}
        <main style={{ marginLeft:'260px', padding:'2rem', width:'calc(100% - 260px)', minHeight:'calc(100vh - 64px)' }}>
          {children}
        </main>

      </div>
    </div>
  );
}