import * as React from "react";
import * as M from "../model";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, mat2d, vec2 } from "../utility/gl-matrix";
import styles from "./Artboard.module.css";

interface Props extends PointerHandlers {
  sprite: M.Sprite;
  transform: ReadonlyMat2d;
  className?: string;
  style?: React.CSSProperties;
}

export default function Artboard({
  sprite,
  transform,
  className,
  style,

  onPointerDown,
  onPointerUp,
  onPointerMove,
}: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx == null) {
      return;
    }
    ctx.clearRect(
      0,
      0,
      vec2.x(M.Sprite.getSize(sprite)),
      vec2.y(M.Sprite.getSize(sprite))
    );
    const minv = mat2d.invert(mat2d.create(), transform);
    const m = mat2d.toComponents(minv);
    ctx.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    ctx.putImageData(M.Sprite.getImageData(sprite), 0, 0);
  }, [sprite, transform]);

  return (
    <div
      className={className}
      style={style}
      {...{ onPointerDown, onPointerMove, onPointerUp }}
    >
      <canvas
        width={16}
        height={16}
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
}
