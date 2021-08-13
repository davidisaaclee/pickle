import * as React from "react";
import * as M from "../model";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, ReadonlyVec2, mat2d, vec2 } from "../utility/gl-matrix";

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
    ctx.clearRect(0, 0, vec2.x(sprite.size), vec2.y(sprite.size));
    const minv = mat2d.invert(mat2d.create(), transform);
    const m = mat2d.toComponents(minv);
    ctx.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    ctx.fillStyle = "green";

    const pixelsToFill: Record<string, readonly [ReadonlyVec2, number]> = {};

    for (const commit of sprite.commits) {
      for (const instr of commit.instructions) {
        const flooredLocs = instr.locations.map(
          (l) => [Math.floor(vec2.x(l)), Math.floor(vec2.y(l))] as const
        );
        if (instr.type === "write-pixels") {
          flooredLocs
            .map((l) => ({
              key: `${l[0]},${l[1]}`,
              value: [l, instr.content] as const,
            }))
            .forEach(({ key, value }) => {
              pixelsToFill[key] = value;
            });
        } else if (instr.type === "clear-pixels") {
          flooredLocs
            .map((l) => `${l[0]},${l[1]}`)
            .forEach((key) => {
              delete pixelsToFill[key];
            });
        }
      }
    }

    const img = new ImageData(vec2.x(sprite.size), vec2.y(sprite.size));
    Object.values(pixelsToFill).forEach(([loc, _content]) => {
      const offset = (loc[0] + loc[1] * vec2.x(sprite.size)) * 4;
      img.data[offset + 0] = 255;
      img.data[offset + 1] = 0;
      img.data[offset + 2] = 0;
      img.data[offset + 3] = 255;
    });
    ctx.putImageData(img, 0, 0);
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
        style={{
          imageRendering: "pixelated",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
