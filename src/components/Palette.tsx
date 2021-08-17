import classNames from "classnames";
import * as React from "react";
import * as M from "../model";
import Button from "./Button";
import styles from "./Palette.module.css";
import arrayEquals from "../utility/arrayEquals";
import { presetPalette, rgbaToCss } from "../utility/colors";

interface Props {
  onSelectColor?: (color: M.PixelContent) => void;
  selectedColor: M.PixelContent;
  className?: string;
  style?: React.CSSProperties;
}

export default function Palette({
  onSelectColor = () => {},
  selectedColor,
  className,
  style,
}: Props) {
  return (
    <div className={classNames(styles.container, className)} style={style}>
      {presetPalette.map((color) => (
        <Button
          className={classNames(
            styles.swatchListItem,
            arrayEquals(selectedColor, color) && styles.selected
          )}
          onClick={() => {
            onSelectColor(color);
          }}
        >
          <ColorSwatch color={color} />
        </Button>
      ))}
    </div>
  );
}

interface ColorSwatch$Props {
  color: [number, number, number, number];
  style?: React.CSSProperties;
}

function ColorSwatch({ color, style }: ColorSwatch$Props) {
  return (
    <div
      className={styles.swatch}
      style={{
        ...style,
        backgroundColor: rgbaToCss(color),
      }}
    />
  );
}
