import * as React from "react";
import arrayEquals from "./arrayEquals";

type UseOnChange = (<A>(
  effect: (prevDeps: [A]) => void | (() => void),
  deps: [A],
  customCompare?: (prev: [A], next: [A]) => boolean
) => void) &
  (<A, B>(
    effect: (prevDeps: [A, B]) => void | (() => void),
    deps: [A, B],
    customCompare?: (prev: [A, B], next: [A, B]) => boolean
  ) => void) &
  (<A, B, C>(
    effect: (prevDeps: [A, B, C]) => void | (() => void),
    deps: [A, B, C],
    customCompare?: (prev: [A, B, C], next: [A, B, C]) => boolean
  ) => void) &
  (<A, B, C, D>(
    effect: (prevDeps: [A, B, C, D]) => void | (() => void),
    deps: [A, B, C, D],
    customCompare?: (prev: [A, B, C, D], next: [A, B, C, D]) => boolean
  ) => void);

export const useOnChange: UseOnChange = <T extends Array<any>>(
  effect: (prevDeps: T) => void | (() => void),
  deps: T,
  customCompare: (prev: T, next: T) => boolean = arrayEquals
): void => {
  const prevDeps = React.useRef<T>(deps);
  React.useEffect(() => {
    if (!customCompare(prevDeps.current, deps)) {
      effect(prevDeps.current);
      prevDeps.current = deps;
    }
  }, [deps]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useOnChange;
