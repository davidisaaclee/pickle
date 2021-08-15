import classNames from "classnames";
import * as React from "react";
import * as M from "../model";
import Button from "./Button";
import styles from "./Palette.module.css";

const presetPalette = [0x04021c, 0xd2186f, 0xe7bbb2, 0x108da1, 0x084738].map(
  (h) => hexToRgba(h, 0xff)
);

const rgbaToCss = (rgba: [number, number, number, number]): string =>
  `rgba(${rgba.join(", ")})`;

function hexToRgba(
  hex: number,
  alpha: number = 0xff
): [number, number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, (hex >> 0) & 0xff, alpha];
}

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
  className?: string;
  style?: React.CSSProperties;
}

function ColorSwatch({ color, className, style }: ColorSwatch$Props) {
  return (
    <div
      className={classNames(styles.swatch, className)}
      style={{ ...style, backgroundColor: rgbaToCss(color) }}
    />
  );
}
