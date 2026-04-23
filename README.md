# MediaExpres

Platformă web pentru distribuție comunicate de presă pe 50 de ziare românești + Facebook.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- MDX pentru blog
- react-hook-form + zod pentru formulare
- Resend pentru email
- Deploy: Railway

## Local dev

```bash
npm install
cp .env.example .env.local
# completează variabilele din .env.local
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000).

## Deploy Railway

1. Conectează repo-ul în Railway dashboard.
2. Setează variabilele din `.env.example`.
3. Railway folosește `nixpacks.toml` + `railway.json` pentru build.
4. Atașează domeniul `mediaexpres.ro` după primul deploy.

## Structura

- `src/app/` — rute App Router
- `src/components/` — componente React
- `src/data/` — pachete, ziare, testimoniale
- `src/lib/` — utilitare (email, mdx, validators)
- `content/blog/` — articole MDX
- `public/` — assets statice
