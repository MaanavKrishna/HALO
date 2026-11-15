/** The noun in the right number: plural(1, 'row') is "row", plural(2, 'row') is "rows". */
export function plural(n: number, one: string, many: string = `${one}s`): string {
  return n === 1 ? one : many;
}

/** A list in words: "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  return names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** Count and noun together: count(1, 'row') is "1 row". */
export function count(n: number, one: string, many?: string): string {
  return `${n} ${plural(n, one, many)}`;
}
