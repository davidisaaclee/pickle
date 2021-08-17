import classNames from "classnames";
import * as React from "react";
import * as M from "../model";
import styles from "./Toolbar.module.css";

interface Props {
  activeTool: M.Tool;
  onSelectTool: (tool: M.Tool) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Toolbar({
  activeTool,
  onSelectTool,
  className,
  style,
}: Props) {
  const onToolChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectTool(event.currentTarget.value as M.Tool);
    },
    [onSelectTool]
  );

  return (
    <div className={classNames(className, styles.container)} style={style}>
      {M.Tool.allTools().map((tool) => (
        <label
          htmlFor={tool}
          key={tool}
          className={classNames(
            styles.toolButton,
            tool === activeTool && styles.selected
          )}
        >
          <input
            type="radio"
            name="tool"
            value={tool}
            id={tool}
            checked={tool === activeTool}
            onChange={onToolChange}
          />
          {tool}
        </label>
      ))}
    </div>
  );
}
