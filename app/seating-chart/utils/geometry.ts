import type { SeatingTable, SeatingGuestWithEvents, TableType, Point } from '@/types/seating'
import { makeGuestEventRow } from '@/lib/seating/test-helpers'

// ── CONSTANTE ──
export const GRID = 20;
export const PLAN_W = 10500;
export const PLAN_H = 10500;
export const PLAN_CX = PLAN_W / 2; // 5250
export const PLAN_CY = PLAN_H / 2; // 5250
export const RING_W = 300;
export const RING_H = 200;

export const LIMITS: Record<TableType, { min: number; max: number; def: number }> = {
  round:    { min: 4, max: 16, def: 8  },
  square:   { min: 4, max: 12, def: 4  },
  rect:     { min: 4, max: 20, def: 10 },
  prezidiu: { min: 4, max: 20, def: 8  },
  bar:      { min: 0, max: 0,  def: 0  },
};

export const TYPE_LABELS: Record<TableType, string> = {
  round:    'Rotundă',
  square:   'Pătrată',
  rect:     'Dreptunghiulară',
  prezidiu: 'Prezidiu',
  bar:      'Bar / Decor',
};

export const GROUP_COLORS: string[] = [
  '#C4896F','#5DAF82','#8B72C8','#D4B85A','#E87AAF',
  '#5B8FBE','#E07878','#62B87E','#D4965A','#9B7EC8',
];

export const INITIAL_GUESTS: SeatingGuestWithEvents[] = [
  { id:1,  prenume:'Ion',    nume:'Popescu',    grup:'Familie Mireasă', status:'confirmat',    meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:2,  prenume:'Maria',  nume:'Ionescu',    grup:'Familie Mireasă', status:'confirmat',    meniu:'Vegetarian',  tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:3,  prenume:'Elena',  nume:'Constantin', grup:'Familie Mireasă', status:'in_asteptare', meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'pending' })] },
  { id:4,  prenume:'Andrei', nume:'Gheorghe',   grup:'Familie Mire',    status:'confirmat',    meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:5,  prenume:'Ana',    nume:'Popa',       grup:'Familie Mire',    status:'confirmat',    meniu:'Fără gluten', tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:6,  prenume:'Vasile', nume:'Dumitrescu', grup:'Prieteni Comuni', status:'declinat',     meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'declined' })] },
  { id:7,  prenume:'Ioana',  nume:'Marinescu',  grup:'Prieteni Comuni', status:'in_asteptare', meniu:'Vegan',       tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'pending' })] },
  { id:8,  prenume:'Mihai',  nume:'Stoica',     grup:'Prezidiu',        status:'confirmat',    meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:9,  prenume:'Carmen', nume:'Florescu',   grup:'Prezidiu',        status:'confirmat',    meniu:'Vegetarian',  tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:10, prenume:'Radu',   nume:'Niculescu',  grup:'Colegi',          status:'in_asteptare', meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'invited' })] },
  { id:11, prenume:'Lucia',  nume:'Dragomir',   grup:'Colegi',          status:'confirmat',    meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
  { id:12, prenume:'Dan',    nume:'Cristea',    grup:'Colegi',          status:'confirmat',    meniu:'Standard',    tableId:null, guest_events:[makeGuestEventRow({ attendance_status:'attending' })] },
];

export const ALL_GROUPS: string[] = [...new Set(INITIAL_GUESTS.map(g => g.grup))];

export function getGroupColor(grup: string): string {
  const idx = ALL_GROUPS.indexOf(grup);
  if (idx !== -1) return GROUP_COLORS[idx % GROUP_COLORS.length] as string;
  let hash = 0;
  for (let i = 0; i < grup.length; i++) {
    hash = grup.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length] as string;
}

// Dimensiunile returnate variază în funcție de tipul mesei.
// Câmpurile opționale sunt prezente doar pentru tipul corespunzător.
export interface TableDims {
  w: number
  h: number
  tw?: number
  th?: number
  cx?: number
  cy?: number
  r?: number
  seatR?: number
  s?: number
  pad?: number
}

export function getTableDims(t: Pick<SeatingTable, 'type' | 'seats' | 'isRing'>): TableDims {
  // Ring dans: dreptunghi mare decorativ
  if (t.isRing) return {w:RING_W, h:RING_H, tw:RING_W-20, th:RING_H-20};
  if (t.type==='round') { const r=Math.max(55,t.seats*8); return {w:(r+90)*2,h:(r+90)*2,cx:r+90,cy:r+90,r,seatR:r+6}; }
  if (t.type==='square') { const ps=Math.ceil(t.seats/4),s=Math.max(110,ps*38+40); return {w:s+60,h:s+60,s,pad:30}; }
  if (t.type==='prezidiu') { const cols=Math.ceil(t.seats/2),w=Math.max(260,cols*38+60); return {w:w+50,h:130,tw:Math.round(w*1.1),th:58}; }
  if (t.type==='bar') { return {w:160,h:88,tw:144,th:72}; }
  const cols=Math.ceil(t.seats/2),w=Math.max(210,cols*36+60); return {w:w+50,h:120,tw:w,th:52};
}

export function getSeatPositions(t: Pick<SeatingTable, 'type' | 'seats' | 'isRing'>): Point[] {
  if (t.type==='bar'||t.isRing) return [];
  const d=getTableDims(t);
  const seats: Point[]=[];
  if (t.type==='round') {
    for (let i=0;i<t.seats;i++) {
      const a=(i/t.seats)*2*Math.PI-Math.PI/2;
      // cx și seatR sunt garantate pentru type==='round'
      seats.push({x:(d.cx as number)+(d.seatR as number)*Math.cos(a),y:(d.cy as number)+(d.seatR as number)*Math.sin(a)});
    }
  } else if (t.type === "square") {
    // s și pad sunt garantate pentru type==='square'
    const { s, pad } = d as { s: number; pad: number; w: number; h: number };
    // Distribuție echilibrată pe 4 laturi: rest se adaugă pe primele laturi
    const base = Math.floor(t.seats / 4);
    const extra = t.seats % 4;
    const counts = [
      base + (extra > 0 ? 1 : 0), // sus
      base + (extra > 1 ? 1 : 0), // dreapta
      base + (extra > 2 ? 1 : 0), // jos
      base,                        // stânga
    ];
    // Sus
    const stepT = s / counts[0];
    for (let i = 0; i < counts[0]; i++) seats.push({ x: pad + stepT * i + stepT / 2, y: pad - 8 });
    // Dreapta
    const stepR = s / counts[1];
    for (let i = 0; i < counts[1]; i++) seats.push({ x: d.w - pad + 8, y: pad + stepR * i + stepR / 2 });
    // Jos
    const stepB = s / counts[2];
    for (let i = counts[2] - 1; i >= 0; i--) seats.push({ x: pad + stepB * i + stepB / 2, y: d.h - pad + 8 });
    // Stânga
    const stepL = s / counts[3];
    for (let i = counts[3] - 1; i >= 0; i--) seats.push({ x: pad - 8, y: pad + stepL * i + stepL / 2 });
    return seats;
  } else if (t.type==='prezidiu') {
    // tw și th sunt garantate pentru type==='prezidiu'
    const {tw}=d as {tw:number;th:number},step=tw/t.seats;
    for(let i=0;i<t.seats;i++) {
      seats.push({x:25+step*i+step/2,y:20-8});
    }
  } else {
    // rect: tw și th sunt garantate pentru tipul default
    const {tw,th}=d as {tw:number;th:number},cols=Math.ceil(t.seats/2),step=tw/cols;
    for(let i=0;i<cols&&seats.length<t.seats;i++) {
      seats.push({x:25+step*i+step/2,y:20-8});
      if(seats.length<t.seats) seats.push({x:25+step*i+step/2,y:20+th+8});
    }
  }
  return seats;
}

export function getSeatFillColor(occupied: number, total: number): string {
  if (total===0) return '#9DA3BC';
  if (occupied >= total) return '#E53E3E';
  return '#48BB78';
}

// ── TEMPLATE: ring + prezidiu + 3 mese, centrate pe PLAN_CX, PLAN_CY ──
// Ring dans: centrul planului
// Prezidiu: deasupra ringului
// Masa 1: stanga, Masa 2: dreapta, Masa 3: jos
export function buildTemplate(): SeatingTable[] {
  // Distante calculate exact:
  // - Mese rotunde: 1 grid (20px) de la scaun pana la ring
  // - Prezidiu: 2 griduri (40px) de la scaun pana la ring
  return [
    // Ring dans — centrul planului
    {
      id: 1, name: 'Ring Dans', type: 'bar',
      seats: 0,
      x: 5100,
      y: 5150,
      rotation: 0,
      isRing: true,
    },
    // Prezidiu — sus, scaunele de jos la 2 griduri de ring
    {
      id: 2, name: 'Prezidiu', type: 'prezidiu',
      seats: 8,
      x: 5095,
      y: 5010,
      rotation: 0,
    },
    // Masa 1 — stanga, scaunul drept la 1 grid de ring
    {
      id: 3, name: 'Masa 1', type: 'round',
      seats: 8,
      x: 4832,
      y: 5096,
      rotation: 0,
    },
    // Masa 2 — dreapta, scaunul stang la 1 grid de ring
    {
      id: 4, name: 'Masa 2', type: 'round',
      seats: 8,
      x: 5360,
      y: 5096,
      rotation: 0,
    },
    // Masa 3 — jos, scaunul de sus la 1 grid de ring
    {
      id: 5, name: 'Masa 3', type: 'round',
      seats: 8,
      x: 5096,
      y: 5310,
      rotation: 0,
    },
  ];
}

export function generateCateringText(tables: SeatingTable[], guests: SeatingGuestWithEvents[]): string {
  const real=tables.filter(t=>t.type!=='bar'&&!t.isRing);
  let txt='🍽️ LISTĂ CATERING\n'+'='.repeat(32)+'\n\n';
  real.forEach(t=>{
    const tg=guests.filter(g=>g.tableId===t.id);
    const mc=tg.reduce<Record<string,number>>((a,g)=>{a[g.meniu]=(a[g.meniu]||0)+1;return a;},{});
    txt+=`${t.name.toUpperCase()} (${tg.length}/${t.seats})\n`;
    Object.entries(mc).forEach(([m,c])=>{txt+=`  • ${c}x ${m}\n`;});
    if(!tg.length) txt+=`  • (masă goală)\n`;
    txt+='\n';
  });
  const total=guests.reduce<Record<string,number>>((a,g)=>{if(g.tableId)a[g.meniu]=(a[g.meniu]||0)+1;return a;},{});
  txt+='='.repeat(32)+'\nTOTAL COMENZI:\n';
  Object.entries(total).forEach(([m,c])=>{txt+=`  • ${c}x ${m}\n`;});
  return txt;
}

export function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}
