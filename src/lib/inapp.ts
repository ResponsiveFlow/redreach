/** Browser interni di Instagram/TikTok/Facebook: Google blocca l'OAuth (disallowed_useragent). */
export function isInAppBrowser(ua: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|musical_ly|Bytedance|BytedanceWebview|TikTok|trill/i.test(ua);
}
