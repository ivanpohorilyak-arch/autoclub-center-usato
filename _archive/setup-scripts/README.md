# Setup Scripts — Archivio

Questi script sono stati spostati qui dalla root del progetto durante una pulizia strutturale.

**Perché archiviati invece di eliminati?**
Sono utility one-shot eseguite in passato (correzioni di import, setup iniziale, setup audit log). Non vengono richiamati da nessun build, deploy o runtime, quindi non servono al funzionamento del progetto. Li conserviamo per riferimento storico — se in futuro vuoi capire come è stato fatto un certo setup, sono qui.

## Contenuto

| File | Cosa fa (presumibilmente) |
|---|---|
| `fix-all-api-imports.sh` | Correzione massiva degli import nelle API route |
| `fix-and-build.sh` | Pipeline correzione import + build |
| `fix-api-imports.sh` | Correzione import nelle API route |
| `fix-imports-absolute.sh` | Conversione import a path assoluti `@/lib` |
| `fix-imports.sh` | Correzione import relativi |
| `proteggi-api.sh` | Setup protezione API (auth-guard?) |
| `setup-audit.sh` | Setup del sistema di audit log |
| `install-v2.sh` | Installazione iniziale Autoclub V2 |

## Possono essere eliminati?

Sì, in qualunque momento. Sono in `_archive/` solo per sicurezza; se dopo qualche settimana di utilizzo non ti sono mai serviti, puoi cancellare l'intera cartella `_archive/`.
