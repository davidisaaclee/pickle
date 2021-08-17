import classNames from "classnames";
import * as React from "react";
import * as M from "../model";
import Button from "./Button";
import styles from "./Palette.module.css";

const presetPalette = [
  [0, 0, 0, 0xff],
  [87, 87, 87, 0xff],
  [173, 35, 35, 0xff],
  [42, 75, 215, 0xff],
  [29, 105, 20, 0xff],
  [129, 74, 25, 0xff],
  [129, 38, 192, 0xff],
  [160, 160, 160, 0xff],
  [129, 197, 122, 0xff],
  [157, 175, 255, 0xff],
  [41, 208, 208, 0xff],
  [255, 146, 51, 0xff],
  [255, 238, 51, 0xff],
  [233, 222, 187, 0xff],
  [255, 205, 243, 0xff],
  [255, 255, 255, 0xff],
] as Array<[number, number, number, number]>;

const rgbaToCss = (rgba: [number, number, number, number]): string =>
  `rgba(${rgba.join(", ")})`;

interface Props {
  onSelectColor?: (color: M.PixelContent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Palette({
  onSelectColor = () => {},
  className,
  style,
}: Props) {
  return (
    <div className={classNames(styles.container, className)} style={style}>
      {presetPalette.map((color) => (
        <Button
          className={styles.swatchListItem}
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
