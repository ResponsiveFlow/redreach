/** Tutti i testi del sito. `en` definisce la forma, `it` deve rispettarla. */
export const en = {
  meta: {
    title: "Red Reach — Claim your plot on Mars",
    description: "The first colony ship has landed on Mars. Pick a zone, reserve your plot and share it.",
  },
  common: {
    brand: "RED REACH",
    privacy: "Privacy",
    colonists: "colonists",
    loading: "One moment…",
    langName: { en: "English", it: "Italiano" },
  },
  zones: {
    ice: { name: "Ice", tagline: "Richest in water ice" },
    metal: { name: "Metal", tagline: "Richest in metal ore" },
    sun: { name: "Sun", tagline: "Richest in solar energy" },
  },
  home: {
    hook: "2056. The first colony ship has landed on Mars. Claim your plot.",
    liveCounter: "Colonists on Mars, live",
    cta: "Choose your zone →",
    note: "Your plot is reserved for you. Your neighbours are real people.",
  },
  shell: {
    steps: ["Zone", "Plot", "Account", "Name"],
    stepOf: "{n}/{total} · {label}",
  },
  signup: {
    emailPlaceholder: "you@email.com",
    emailLabel: "Email",
    consent: "I have read and accept the {link}.",
    privacyPolicy: "privacy policy",
    sendCode: "Get the code",
    sending: "Sending…",
    or: "or",
    google: "Continue with Google",
    inAppHint: "Want to use Google? Open this page in your browser (menu ⋯ → “Open in browser”).",
    codeSent: "We sent a 6-digit code to {email}. Open the email, copy the code and come back here.",
    codeLabel: "6-digit code",
    resendIn: "Resend in {s}s",
    resend: "Send the code again",
    changeEmail: "Change email",
    errTooMany: "Too many attempts. Wait a minute and try again.",
    errSend: "We couldn't send the code. Check your email and try again.",
    errCode: "Invalid or expired code. Check your email or request a new one.",
  },
  cookies: {
    text: "We only use technical cookies (language, login, where you came from). No ads.",
    ok: "OK",
  },
  privacyPage: {
    title: "Privacy policy",
    body: [
      "Red Reach is a market test: the game is not out yet. We collect your email, the zone and plot you reserve, your colonist name, the language, where you came from (e.g. the Instagram username you gave us) and who invited you.",
      "We use this data only to run the reservation, show the map, count how many people are interested and, if you're in, to tell you about the game. Your email is never shown to other users. Your colonist name and plot are public on the map.",
      "We use technical cookies only: language, login, and the source of your visit. No advertising cookies.",
      "To access, correct or delete your data, write to {email}.",
    ],
    back: "← Back",
  },
};

export type Dict = typeof en;
