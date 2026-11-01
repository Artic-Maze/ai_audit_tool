const integer = new Intl.NumberFormat("en-US");

export const fmtInt = (n) => integer.format(n);

// Percentage with one decimal place, from integer math so every machine
// rounds it the same way. null when there's nothing to divide by.
export function pct(part, whole) {
  return whole ? Math.round((part * 1000) / whole) / 10 : null;
}

export const fmtPct = (value) => `${value}%`;

export const fmtMs = (ms) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;

// "1 product", "1,000 products"
export const count = (n, one, many = `${one}s`) =>
  `${fmtInt(n)} ${n === 1 ? one : many}`;

export const has = (n) => (n === 1 ? "has" : "have");

export function quote(text, max = 60) {
  return `"${text.length > max ? `${text.slice(0, max - 1)}…` : text}"`;
}

export const sum = (values) => values.reduce((total, v) => total + v, 0);
