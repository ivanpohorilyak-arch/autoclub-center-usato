export const ZONE_INFO = {
  Z01: {
    nome: "Deposito N.9",
    descrizione: "Deposito N.9",
  },
  Z02: {
    nome: "Deposito N.7",
    descrizione: "Deposito N.7",
  },
  Z03: {
    nome: "Deposito N.6 (Lavaggisti)",
    descrizione: "Deposito N.6 (Lavaggisti)",
  },
  Z04: {
    nome: "Deposito unificato 1 e 2",
    descrizione: "Deposito unificato 1 e 2",
  },
  Z05: {
    nome: "Showroom",
    descrizione: "Showroom",
  },
  Z06: {
    nome: "Vetture vendute",
    descrizione: "Vetture vendute",
  },
  Z07: {
    nome: "Piazzale Lavaggio",
    descrizione: "Piazzale Lavaggio",
  },
  Z08: {
    nome: "Commercianti senza telo",
    descrizione: "Commercianti senza telo",
  },
  Z09: {
    nome: "Commercianti con telo",
    descrizione: "Commercianti con telo",
  },
  Z10: {
    nome: "Lavorazioni esterni",
    descrizione: "Lavorazioni esterni",
  },
  Z11: {
    nome: "Verso altre sedi",
    descrizione: "Verso altre sedi",
  },
  Z12: {
    nome: "Deposito N.10",
    descrizione: "Deposito N.10",
  },
  Z13: {
    nome: "Deposito N.8",
    descrizione: "Deposito N.8",
  },
  Z14: {
    nome: "Esterno (Con o Senza telo Motorsclub)",
    descrizione: "Esterno (Con o Senza telo Motorsclub)",
  },
} as const

export type ZoneId = keyof typeof ZONE_INFO
