import classNames from "classnames";
import * as React from "react";
import styles from "./CursorModeButtons.module.css";

interface Props {
  onButtonChanged: (isDown: boolean, buttonType: "paint") => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function CursorModeButtons({
  onButtonChanged,
  className,
  style,
}: Props) {
  const [primaryButtonDown, setPrimaryButtonDown] = React.useState(false);
  // const [secondaryButtonDown,  setSecondaryButtonDown] = React.useState(false);

  React.useEffect(() => {
    onButtonChanged(primaryButtonDown, "paint");
  }, [primaryButtonDown]);

  return (
    <div style={style} className={className}>
      <div className={classNames(styles.button, styles.secondaryButton)}>
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
