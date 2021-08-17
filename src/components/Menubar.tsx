import classNames from "classnames";
import * as React from "react";
import styles from "./Menubar.module.css";

type MomentaryButton =
  | "undo"
  | "redo"
  | "export"
  | "toggle-cursor"
  | "copy-frame"
  | "paste-frame";

interface Props {
  onTapButton: (button: MomentaryButton) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Menubar({ onTapButton, className, style }: Props) {
  return (
    <div className={classNames(className, styles.container)} style={style}>
      <button className={styles.button} onClick={() => onTapButton("export")}>
        Export
      </button>
      <button
        className={styles.button}
        onClick={() => onTapButton("copy-frame")}
      >
        Copy frame
      </button>
      <button
        className={styles.button}
        onClick={() => onTapButton("paste-frame")}
      >
        Paste frame
      </button>
      <button
        className={styles.button}
        onClick={() => onTapButton("toggle-cursor")}
      >
        Toggle cursor
      </button>
      <button className={styles.button} onClick={() => onTapButton("undo")}>
        Undo
      </button>
      <button className={styles.button} onClick={() => onTapButton("redo")}>
        Redo
      </button>
    </div>
  );
}
