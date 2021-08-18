import classNames from "classnames";
import * as React from "react";
import styles from "./CursorModeButtons.module.css";

interface Props {
  onButtonChanged: (
    isDown: boolean,
    buttonType: "paint" | "pick-color"
  ) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function CursorModeButtons({
  onButtonChanged,
  className,
  style,
}: Props) {
  const [primaryButtonDown, setPrimaryButtonDown] = React.useState(false);
  const [secondaryButtonDown, setSecondaryButtonDown] = React.useState(false);

  const onButtonChangedRef = React.useRef(onButtonChanged);
  onButtonChangedRef.current = onButtonChanged;

  React.useEffect(() => {
    onButtonChangedRef.current(primaryButtonDown, "paint");
  }, [primaryButtonDown]);
  React.useEffect(() => {
    onButtonChangedRef.current(secondaryButtonDown, "pick-color");
  }, [secondaryButtonDown]);

  return (
    <div style={style} className={classNames(styles.container, className)}>
      <div
        className={classNames(styles.button, styles.secondaryButton)}
        data-pressed={secondaryButtonDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          event.stopPropagation();
          setSecondaryButtonDown(true);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          event.stopPropagation();
          setSecondaryButtonDown(false);
        }}
      >
        Pick color
      </div>
      <div
        className={classNames(styles.button, styles.primaryButton)}
        data-pressed={primaryButtonDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          event.stopPropagation();
          setPrimaryButtonDown(true);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          event.stopPropagation();
          setPrimaryButtonDown(false);
        }}
      >
        Paint
      </div>
    </div>
  );
}
