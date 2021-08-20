import classNames from "classnames";
import * as React from "react";
import * as M from "../model";
import { vec2 } from "../utility/gl-matrix";
import styles from "./Artboard.module.css";

interface Props {
  sprite: M.Sprite;
  offset?: M.PixelVec2;
  contentDimensions?: M.PixelVec2;
  onLayout?: (boundingClientRect: DOMRect) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface Ref {
  getDataURI(): string | null;
}

export default React.memo(
  React.forwardRef<Ref, Props>(function Artboard(
    { sprite, offset = [0, 0], contentDimensions = [16, 16], className, style },
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
      ctx.putImageData(
        M.Sprite.makeImageDataForSlice(sprite, offset, contentDimensions),
        0,
        0
      );
    }, [sprite, offset, contentDimensions]);

    React.useImperativeHandle(forwardedRef, () => ({
      getDataURI() {
        return canvasRef.current?.toDataURL() ?? null;
      },
    }));

    return (
      <canvas
        width={vec2.x(contentDimensions)}
        height={vec2.y(contentDimensions)}
        ref={canvasRef}
        className={classNames(styles.canvas, className)}
        style={style}
      />
    );
  })
);
