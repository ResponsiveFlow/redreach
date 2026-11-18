import type { Dict } from "./en";

export const it: Dict = {
  meta: {
    title: "Red Reach — Prenota il tuo lotto su Marte",
    description: "La prima nave coloniale è atterrata su Marte. Scegli una zona, prenota il tuo lotto e condividilo.",
  },
  common: {
    brand: "RED REACH",
    privacy: "Privacy",
    colonists: "coloni",
    loading: "Un attimo…",
    langName: { en: "English", it: "Italiano" },
  },
  zones: {
    ice: { name: "Ghiaccio", tagline: "Più ricca di ghiaccio d'acqua" },
    metal: { name: "Metalli", tagline: "Più ricca di minerali metallici" },
    sun: { name: "Sole", tagline: "Più ricca di energia solare" },
  },
  home: {
    hook: "2056. La prima nave coloniale è atterrata su Marte. Prenota il tuo lotto.",
    liveCounter: "Coloni su Marte, in tempo reale",
    cta: "Scegli la tua zona →",
    note: "Il tuo lotto è riservato per te. I tuoi vicini sono persone vere.",
  },
  shell: {
    steps: ["Zona", "Lotto", "Account", "Nome"],
    stepOf: "{n}/{total} · {label}",
  },
  signup: {
    emailPlaceholder: "la.tua@email.it",
    emailLabel: "Email",
    consent: "Ho letto e accetto la {link}.",
    privacyPolicy: "privacy policy",
    sendCode: "Ricevi il codice",
    sending: "Invio…",
    or: "oppure",
    google: "Continua con Google",
    inAppHint: "Vuoi usare Google? Apri questa pagina nel browser (menu ⋯ → «Apri nel browser»).",
    codeSent: "Abbiamo mandato un codice a 6 cifre a {email}. Apri la mail, copia il codice e torna qui.",
    codeLabel: "Codice a 6 cifre",
    resendIn: "Invia di nuovo tra {s}s",
    resend: "Invia di nuovo il codice",
    changeEmail: "Cambia email",
    errTooMany: "Troppi tentativi. Aspetta un minuto e riprova.",
    errSend: "Non siamo riusciti a inviare il codice. Controlla l'email e riprova.",
    errCode: "Codice non valido o scaduto. Controlla la mail o richiedine uno nuovo.",
  },
  cookies: {
    text: "Usiamo solo cookie tecnici (lingua, accesso, provenienza). Nessuna pubblicità.",
    ok: "OK",
  },
  privacyPage: {
    title: "Privacy policy",
    body: [
      "Red Reach è un test di mercato: il gioco non è ancora uscito. Raccogliamo la tua email, la zona e il lotto che prenoti, il nome da colono, la lingua, da dove arrivi (es. l'username Instagram che ci hai indicato) e chi ti ha invitato.",
      "Usiamo questi dati solo per gestire la prenotazione, mostrare la mappa, contare quante persone sono interessate e, se sei dentro, avvisarti sul gioco. La tua email non viene mai mostrata ad altri utenti. Il tuo nome da colono e il tuo lotto sono pubblici sulla mappa.",
      "Usiamo solo cookie tecnici: lingua, accesso e provenienza della visita. Nessun cookie pubblicitario.",
      "Per accedere ai tuoi dati, correggerli o cancellarli scrivi a {email}.",
    ],
    back: "← Indietro",
  },
};
