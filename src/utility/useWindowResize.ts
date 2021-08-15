import * as React from "react";

export default function useWindowResize(onResize: (event: UIEvent) => void) {
  React.useEffect(() => {
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [onResize]);
}

export function useValueFromInnerWindowSize<T>(
  calculateValue: (size: [number, number]) => T
): T {
  const [value, setValue] = React.useState(
    calculateValue([window.innerWidth, window.innerHeight])
  );
  const onResize = React.useCallback(() => {
    setValue(calculateValue([window.innerWidth, window.innerHeight]));
  }, [setValue, calculateValue]);
  useWindowResize(onResize);
  return value;
}
