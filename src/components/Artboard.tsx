import * as React from "react";
import * as M from "../model";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, mat2d, vec2 } from "../utility/gl-matrix";
import styles from "./Artboard.module.css";

interface Props extends PointerHandlers {
  sprite: M.Sprite;
  transform: ReadonlyMat2d;
  onLayout?: (boundingClientRect: DOMRect) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface Ref {
  getDataURI(): string | null;
}

export default React.forwardRef<Ref, Props>(function Artboard(
  {
    sprite,
    transform,
    className,
    style,

    onPointerDown,
    onPointerUp,
    onPointerMove,
  },
  forwardedRef
) {
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

  React.useImperativeHandle(forwardedRef, () => ({
    getDataURI() {
      return canvasRef.current?.toDataURL() ?? null;
    },
  }));

  return (
    <div
      className={className}
      style={style}
      {...{ onPointerDown, onPointerMove, onPointerUp }}
    >
      <canvas
        width={vec2.x(M.Sprite.getSize(sprite))}
        height={vec2.y(M.Sprite.getSize(sprite))}
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
});
