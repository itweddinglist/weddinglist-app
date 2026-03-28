# weddinglist-app

Aplicație Next.js pentru plan de mese la nunți (wedding planning SaaS).

- **Producție**: [app.weddinglist.ro](https://app.weddinglist.ro)
- **WordPress**: [weddinglist.ro](https://www.weddinglist.ro)
- **Repository**: [github.com/itweddinglist/weddinglist-app](https://github.com/itweddinglist/weddinglist-app)

---

## Setup local de la zero

### Cerințe
- Node.js v18+ (recomandat v24)
- npm v9+
- Git
- Cont Supabase (proiect DEV existent)
- Acces la repo GitHub

### 1. Clonează repo-ul
```bash
git clone https://github.com/itweddinglist/weddinglist-app.git
cd weddinglist-app
git checkout develop
```

### 2. Instalează dependențele
```bash
npm install
```

### 3. Configurează variabilele de mediu
Creează fișierul `.env.local` în rădăcina proiectului:
```env
NEXT_PUBLIC_SUPABASE_URL=https://typpwztdmtodxfmyrtzw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_WP_URL=https://www.weddinglist.ro
SENTRY_DSN=your_sentry_dsn
```

> ⚠️ Nu comite niciodată `.env.local` — e în `.gitignore`

### 4. Pornește dev server-ul
```bash
npm run dev
```

Aplicația rulează la [http://localhost:3000](http://localhost:3000)

---

## Command cheat sheet

### Development
```bash
npm run dev          # pornește dev server (Next.js)
npm run build        # build de producție
npm run start        # pornește build de producție local
npm run lint         # rulează ESLint
```

### Teste
```bash
npx vitest run       # rulează toate testele (baseline: 341/341)
npx vitest           # watch mode
npx vitest run --reporter=verbose  # output detaliat
```

### Git workflow
```bash
# Branch nou pentru feature
git checkout develop
git pull origin develop
git checkout -b feature/nume-feature

# Commit
git add fisier1 fisier2
git commit -m "feat(scope): descriere lowercase"

# Push + PR
git push origin feature/nume-feature
# → deschide PR pe GitHub spre develop

# Sync după merge
git checkout develop
git pull origin develop
```

### Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref typpwztdmtodxfmyrtzw
npx supabase db diff           # vezi diferențe față de schema locală
npx supabase migration new     # creează migrație nouă
npx supabase db push           # aplică migrații pe DEV
```

---

## Structură proiect

```
app/
  seating-chart/          # Seating Chart (CSS custom, izolat de Tailwind)
    components/           # TableNode, GuestSidebar, CanvasToolbar etc.
    hooks/                # useSeatingData, useSeatingUI, useCamera etc.
    utils/                # geometry, storage, magicFill, exportPng
    page.js               # orchestrator principal
  components/             # Componente globale (SaveIndicator, ErrorBoundary etc.)
  lib/                    # Auth, autosave, migration, Supabase client
  config/                 # wedding.js — config centralizat
  api/                    # API routes (health, auth/provision, migrate-local)
supabase/
  migrations/             # Schema changes — DOAR prin migrații
```

---

## Reguli esențiale

- **Seating Chart e izolat** — CSS custom propriu, fără Tailwind, nu se rescrie
- **Schema changes** — DOAR prin `supabase migration new`, niciodată manual în dashboard
- **TypeScript strict** pe tot codul nou
- **PR obligatoriu** — nu se face push direct pe `develop` sau `main`
- **Teste verzi** înainte de orice merge — `npx vitest run` trebuie să fie 341/341
- **Commit messages** în română, lowercase după tip: `feat(scope): descriere`

---

## Branch-to-environment

| Branch | Environment | Supabase |
|--------|-------------|----------|
| `main` | Producție — app.weddinglist.ro | PROD |
| `develop` | Staging — Vercel preview | DEV |
| `feature/*` | Preview URL unic per PR | DEV |

---

## Stack

- **Next.js 16** + React + TypeScript strict
- **Tailwind CSS** (pagini noi) + CSS custom (seating chart)
- **Supabase EU Frankfurt** — dev + prod separate
- **Vercel** deploy
- **Sentry EU** cu GDPR scrubbing
- **Resend** pentru email
- **Vitest** pentru teste
