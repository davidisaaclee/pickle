import * as React from "react";
import * as M from "../model";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, mat2d, vec2 } from "../utility/gl-matrix";
import styles from "./Artboard.module.css";

interface Props extends PointerHandlers {
  sprite: M.Sprite;
  transform: ReadonlyMat2d;
  offset?: M.PixelVec2;
  contentDimensions?: M.PixelVec2;
  onLayout?: (boundingClientRect: DOMRect) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: JSX.Element;
}

interface Ref {
  getDataURI(): string | null;
}

export default React.forwardRef<Ref, Props>(function Artboard(
  {
    sprite,
    transform,
    offset = [0, 0],
    contentDimensions = [16, 16],
    className,
    style,

    onPointerDown,
    onPointerUp,
    onPointerMove,
    children,
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
    ctx.putImageData(
      M.Sprite.makeImageDataForSlice(sprite, offset, contentDimensions),
      0,
      0
    );
  }, [sprite, transform, offset, contentDimensions]);

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
        width={vec2.x(contentDimensions)}
        height={vec2.y(contentDimensions)}
        ref={canvasRef}
        className={styles.canvas}
      />
      {children}
    </div>
  );
});
