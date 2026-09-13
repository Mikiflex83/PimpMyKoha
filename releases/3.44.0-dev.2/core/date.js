(function(global){
  "use strict";
  const KT = global.KohaTools;
  if (!KT) return;

  function parseDateFR(dateStr) {
    if (!dateStr) return null;
    const m = String(dateStr).trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function parseDateTimeFR(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).trim().split(/\s+/);
    const d = parseDateFR(parts[0]);
    if (!d) return null;
    if (parts[1]) {
      const t = parts[1].split(":").map(Number);
      if (t.length >= 2 && Number.isFinite(t[0]) && Number.isFinite(t[1])) {
        d.setHours(t[0], t[1], 0, 0);
      }
    }
    return d;
  }

  function elapsed(date, now = new Date()) {
    if (!date || Number.isNaN(date.getTime())) return null;
    const diffMs = now - date;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    const months = Math.floor(days / 30.44);
    const years = Math.floor(days / 365.25);
    if (years >= 1) return `il y a ${years} an${years > 1 ? "s" : ""}`;
    if (months >= 1) return `il y a ${months} mois`;
    if (days >= 1) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
    if (hours >= 1) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
    if (minutes >= 1) return `il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
    return "à l’instant";
  }

  const api = { parseDateFR, parseDateTimeFR, elapsed };
  KT.registerService("date", api);
  if (!global.VC_DATE_UTILS) {
    global.VC_DATE_UTILS = {
      parseDateFR,
      parseDateTimeFR,
      tempsEcoule: elapsed,
      skipKohaAgeInsertion: true
    };
  }
})(window);