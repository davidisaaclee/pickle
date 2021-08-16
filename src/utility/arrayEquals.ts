export default function arrayEquals<T>(
  a: T[],
  b: T[],
  elementEquality: (a: T, b: T) => boolean = (a, b) => a === b
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!elementEquality(a[i], b[i])) {
      return false;
    }
  }
  return true;
}
