export default function arrayEquals<Element, Vector extends ArrayLike<Element>>(
  a: Vector,
  b: Vector,
  elementEquality: (a: Element, b: Element) => boolean = (a, b) => a === b
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
