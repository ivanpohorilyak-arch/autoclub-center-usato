# CLEANUP — Fase 1 (pulizia strutturale a rischio zero)

Modifiche applicate rispetto allo zip originale `autoclub-center-usato-main`.

## ✅ Cosa è cambiato

### 1. Archiviati gli script `.sh` di setup
Spostati da `/` a `/_archive/setup-scripts/`:
- `fix-all-api-imports.sh`
- `fix-and-build.sh`
- `fix-api-imports.sh`
- `fix-imports-absolute.sh`
- `fix-imports.sh`
- `proteggi-api.sh`
- `setup-audit.sh`
- `install-v2.sh`

Sono utility one-shot già eseguite, nessuna è richiamata da build/deploy/runtime.
Aggiunto `_archive/setup-scripts/README.md` che spiega cosa contiene.

### 2. Rimosso `tailwind.config.ts`
Era un file vuoto (0 byte). La config Tailwind attiva è e rimane `tailwind.config.js`.

## ❌ Cosa NON è stato toccato

- Nessun file `.ts`/`.tsx` modificato
- Nessuna dipendenza modificata in `package.json`
- Nessuna route API toccata
- Nessuna logica applicativa modificata

## 🧪 Verifica prima di deployare

Una volta scompattato e installato (`npm install`), per essere sicuri che nulla sia rotto:

```bash
npm run build
```

Se il build passa, sei a posto — il deploy su Vercel funzionerà identico a prima.

## 📋 Prossimi step suggeriti (non applicati qui)

- **Fase 2**: aggiungere ESLint (`npm i -D eslint eslint-config-next`) + script `"lint": "next lint"` nel `package.json`.
- **Fase 3 (refactor vero, non pulizia)**: unificare le coppie di route doppie:
  - `/api/consegna` ↔ `/api/veicolo/consegna`
  - `/api/modifica` ↔ `/api/veicolo/modifica`
  E unificare le due implementazioni della ricerca veicolo (`app/(protected)/ricerca/page.tsx` vs `components/ricerca/ricerca-veicolo.tsx`).
- **Fase 4 (refactor architetturale)**: estrarre in `lib/` le utility duplicate in tutte le 22 API route (`getSupabase()`, `jsonNoCache()`).
