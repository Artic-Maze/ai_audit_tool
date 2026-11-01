const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

// Numbers compared by value, so "1,000" matches 1000 and "$24.00" matches 24.
function numbersIn(text) {
  return new Set(
    (text.match(NUMBER) ?? []).map((n) => Number(n.replace(/,/g, ""))),
  );
}

// The numbers in `text` that appear nowhere in `facts`. The LLM may only
// repeat figures it was given, so anything here was invented or recomputed.
export function ungroundedNumbers(text, facts) {
  const allowed = numbersIn(facts);
  return [...numbersIn(text)].filter((n) => !allowed.has(n));
}
