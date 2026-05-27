# STAX — Gaming Hub Platform

O platformă unde jucătorii pot crea și se pot alătura hub-uri de gaming, pot comunica prin chat în timp real și găsi alți jucători cu interese similare.

## Ce face proiectul

- **Hub-uri de gaming** — creezi sau te alături unui grup de jucători pentru un joc specific, în mod Ranked sau 4Fun
- **Chat în timp real** — mesaje sincronizate instant între toți membrii unui hub via Supabase Realtime
- **Sistem de cereri** — hub-urile pot fi libere (Free Join) sau cu aprobare (owner acceptă/respinge cereri)
- **Management hub** — owner-ul poate kick membri, promova un nou owner sau șterge hub-ul
- **Profil jucător** — username, Discord tag și lista de jocuri preferate
- **Filtrare și sortare** — caută hub-uri după nume, joc, mod de joc; sortare după cele mai noi sau cele mai populare

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **CI/CD**: GitHub Actions → Vercel

## Instalare

### Cerințe
- Node.js 20+
- Un proiect Supabase creat pe [supabase.com](https://supabase.com)

### Pași

```bash
# 1. Clonează repo-ul
git clone https://github.com/Stefaannn/staX.git
cd staX/Stax

# 2. Instalează dependențele
npm install

# 3. Configurează variabilele de mediu
cp .env.local.example .env.local
```

Editează `.env.local` cu datele din proiectul tău Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
# 4. Pornește serverul de development
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000).

## Rulare teste

Proiectul nu are încă teste automatizate. Verificarea calității codului se face prin:

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build (verifică că totul compilează)
npm run build
```

Acestea rulează automat în GitHub Actions la fiecare push sau pull request.

## Teste de performanță (k6)

Proiectul include un script de load testing care simulează 20 de utilizatori simultani.

### Instalare k6

```powershell
winget install k6 --source winget
```

### Rulare (pagini publice)

Asigură-te că aplicația rulează local (`npm run dev`), apoi într-un terminal separat:

```powershell
k6 run tests/load-test.js
```

### Rulare cu API Supabase (autentificat)

```powershell
k6 run tests/load-test.js `
  -e SUPABASE_URL=https://xxxx.supabase.co `
  -e SUPABASE_ANON_KEY=your-anon-key `
  -e TEST_EMAIL=test@email.com `
  -e TEST_PASSWORD=parola
```

### Praguri acceptate

| Metric | Prag |
|---|---|
| Response time p(95) | < 800ms |
| Error rate | < 5% |
| Hub load time p(95) | < 1000ms |

## Contribuții

1. Fork la repo
2. Creează un branch nou: `git checkout -b feature/nume-feature`
3. Fă modificările și asigură-te că trec verificările:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
4. Commit și push: `git push origin feature/nume-feature`
5. Deschide un Pull Request spre `main`

Pull request-urile sunt verificate automat de CI înainte de merge.
