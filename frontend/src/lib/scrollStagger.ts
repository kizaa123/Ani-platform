/** Stagger helper — index × interval (default 100ms). Safe for Server Components. */
export function scrollStagger(index: number, interval = 100): number {
  return index * interval;
}
