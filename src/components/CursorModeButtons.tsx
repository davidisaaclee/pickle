import classNames from "classnames";
import * as React from "react";
import * as M from "../model";
import styles from "./CursorModeButtons.module.css";

const toolTitles: Record<M.Tool, string> = {
  bucket: "fill",
  pickColor: "sample",
  eraser: "erase",
  pen: "paint",
  grab: "move",
};

interface Props {
  // Code: [a, b, c, d]
  // UI:  [a] [b]
  //      [c] [d]
  toolSet: [M.Tool, M.Tool, M.Tool, M.Tool];

  onButtonChanged: (isDown: boolean, tool: M.Tool) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function CursorModeButtons({
  toolSet,
  onButtonChanged,
  className,
  style,
}: Props) {
  const [buttonStates, setButtonStates] = React.useState(
    {} as Record<M.Tool, boolean>
  );

  return (
    <div style={style} className={classNames(styles.container, className)}>
      {toolSet.map((tool) => (
        <div
          key={tool}
          className={classNames(styles.button, styles.secondaryButton)}
          data-pressed={buttonStates[tool] ?? false}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.stopPropagation();

            onButtonChanged(true, tool);
            setButtonStates((prev) => ({
              ...prev,
              [tool]: true,
            }));
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            event.stopPropagation();

            onButtonChanged(false, tool);
            setButtonStates((prev) => ({
              ...prev,
              [tool]: false,
            }));
          }}
        >
          {toolTitles[tool]}
        </div>
      ))}
    </div>
  );
}
