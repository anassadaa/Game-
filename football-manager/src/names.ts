/** Short pitch label: surname without regen suffix, trimmed to fit a pitch disc. */
export const surname = (n: string) => {
  const parts = n.split(' ').filter((x) => !/^\d+$/.test(x));
  const s = parts.at(-1) ?? n;
  return s.length > 8 ? `${s.slice(0, 7)}.` : s;
};
