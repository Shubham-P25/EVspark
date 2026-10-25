// probability an arriving customer has to wait, M/M/c with offered load a = lambda / mu
export function erlangC(c: number, a: number): number {
  let sum = 0;
  let term = 1;
  for (let k = 0; k < c; k++) {
    sum += term;
    term = (term * a) / (k + 1);
  }
  const top = term * (c / (c - a));
  return top / (sum + top);
}

// mean wait in queue, seconds; lambda and mu in 1/second
export function mmcMeanWait(lambda: number, mu: number, c: number): number {
  const a = lambda / mu;
  if (a >= c) return Infinity;
  return erlangC(c, a) / (c * mu - lambda);
}
