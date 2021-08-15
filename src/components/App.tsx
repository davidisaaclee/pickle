import * as React from "react";
import * as M from "../model";
import { vec2 } from "../utility/gl-matrix";
import Editor from "./Editor";

export default function App() {
  const [spriteHistory, setSpriteHistory] = React.useState<{
    frames: Array<M.Sprite>;
    cursor: number;
  }>(() => ({ frames: [M.Sprite.create()], cursor: 0 }));

  const [activeTool, setActiveTool] = React.useState<M.Tool>("pen");

  const [activeColor, setActiveColor] = React.useState<M.PixelContent>([
    255, 0, 0, 255,
  ]);

  const pushHistory = React.useCallback(() => {
    setSpriteHistory((prev) => {
      const frames = [...prev.frames];
      if (prev.cursor < frames.length - 1) {
        frames.splice(prev.cursor + 1, frames.length - prev.cursor);
      }
      frames.push(M.Sprite.deepClone(frames[frames.length - 1]));
      return { frames, cursor: prev.cursor + 1 };
    });
  }, [setSpriteHistory]);

  const activeSprite = React.useMemo(
    () => spriteHistory.frames[spriteHistory.cursor],
    [spriteHistory]
  );

  const setActiveSprite = React.useCallback(
    (updater: (prev: M.Sprite) => M.Sprite) => {
      setSpriteHistory((prev) => ({
        ...prev,
        frames: [
          ...prev.frames.slice(0, prev.cursor),
          updater(prev.frames[prev.cursor]),
          ...prev.frames.slice(prev.cursor + 1, prev.frames.length - 1),
        ],
      }));
    },
    [setSpriteHistory]
  );

  const spriteSize = M.Sprite.getSize(activeSprite);

  const paintPixels = React.useCallback(
    (artboardPos: readonly [number, number]) => {
      if (
        vec2.x(artboardPos) < 0 ||
        vec2.x(artboardPos) >= vec2.x(spriteSize)
      ) {
        return;
      }
      if (
        vec2.y(artboardPos) < 0 ||
        vec2.y(artboardPos) >= vec2.y(spriteSize)
      ) {
        return;
      }
      setActiveSprite((prev) => {
        const out = M.Sprite.shallowClone(prev);
        M.Sprite.setPixelsRGBA(
          out,
          [vec2.toTuple(vec2.floor(vec2.create(), artboardPos))],
          activeTool === "pen" ? activeColor : [0, 0, 0, 0]
        );
        M.Sprite.updateEditHash(out);
        return out;
      });
    },
    [activeColor, spriteSize, setActiveSprite, activeTool]
  );

  const beginPaint = React.useCallback(
    (artboardPos: readonly [number, number]) => {
      pushHistory();
      paintPixels(vec2.toTuple(artboardPos));
    },
    [paintPixels, pushHistory]
  );

  const undo = React.useCallback(() => {
    setSpriteHistory((prev) => ({
      ...prev,
      cursor: Math.max(0, prev.cursor - 1),
    }));
  }, []);

  const redo = React.useCallback(() => {
    setSpriteHistory((prev) => ({
      ...prev,
      cursor: Math.min(prev.frames.length - 1, prev.cursor + 1),
    }));
  }, []);

  return (
    <Editor
      {...{
        setActiveTool,
        activeTool,
        setActiveColor,
        activeSprite,
        beginPaint,
        paintPixels,
        undo,
        redo,
      }}
    />
  );
}
