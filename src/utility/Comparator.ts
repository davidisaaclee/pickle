export type Comparator<T> = (a: T, b: T) => boolean;

type FlattenComparators = (<A>(
  c: readonly [Comparator<A>]
) => Comparator<readonly [A]>) &
  (<A, B>(
    c: readonly [Comparator<A>, Comparator<B>]
  ) => Comparator<readonly [A, B]>) &
  (<A, B, C>(
    c: readonly [Comparator<A>, Comparator<B>, Comparator<C>]
  ) => Comparator<readonly [A, B, C]>) &
  (<A, B, C, D>(
    c: readonly [Comparator<A>, Comparator<B>, Comparator<C>, Comparator<D>]
  ) => Comparator<readonly [A, B, C, D]>);

const flattenComparators: FlattenComparators = (
  comparators: readonly Comparator<any>[]
): Comparator<readonly any[]> => {
  return (left, right) => {
    if (left.length !== right.length) {
      throw new Error("Length mismatch");
    }

    for (let i = 0; i < left.length; i++) {
      if (!comparators[i](left[i], right[i])) {
        return false;
      }
    }
    return true;
  };
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Comparator = {
  flatten: flattenComparators,

  equals<T>(a: T, b: T) {
    return a === b;
  },

  arrayEquals<Element, Vector extends ArrayLike<Element>>(
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
  },
};
