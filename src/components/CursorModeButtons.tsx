import classNames from "classnames";
import * as React from "react";
import styles from "./CursorModeButtons.module.css";

interface Props {
  onButtonChanged: (
    isDown: boolean,
    buttonType: "primary" | "secondary"
  ) => void;
  primaryButtonTitle: string;
  secondaryButtonTitle: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CursorModeButtons({
  onButtonChanged,
  primaryButtonTitle,
  secondaryButtonTitle,
  className,
  style,
}: Props) {
  const [primaryButtonDown, setPrimaryButtonDown] = React.useState(false);
  const [secondaryButtonDown, setSecondaryButtonDown] = React.useState(false);

  const onButtonChangedRef = React.useRef(onButtonChanged);
  onButtonChangedRef.current = onButtonChanged;

  React.useEffect(() => {
    onButtonChangedRef.current(primaryButtonDown, "primary");
  }, [primaryButtonDown]);
  React.useEffect(() => {
    onButtonChangedRef.current(secondaryButtonDown, "secondary");
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
        {secondaryButtonTitle}
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
        {primaryButtonTitle}
      </div>
    </div>
  );
}
