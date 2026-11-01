// Plain code-unit comparison. Unlike localeCompare it doesn't depend on the
// machine's locale, so sorted output is identical everywhere.
export const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
