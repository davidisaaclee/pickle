import * as React from "react";
import classNames from "classnames";
import Artboard from "../components/Artboard";
import ArtboardInteractionHandler from "../components/ArtboardInteractionHandler";
import Toolbar from "../components/Toolbar";
import * as M from "../model";
import styles from "./App.module.css";
import { mat2d, vec2 } from "../utility/gl-matrix";
import { useValueFromInnerWindowSize } from "../utility/useWindowResize";

function App() {
  const artboardRef = React.useRef<React.ElementRef<typeof Artboard>>(null);

  const artboardClientSize = useValueFromInnerWindowSize<[number, number]>(
    ([width, height]) => {
      const minorLength = Math.min(width, height);
      return [minorLength * 0.5, minorLength * 0.5];
    }
  );

  const [spriteHistory, setSpriteHistory] = React.useState<{
    frames: Array<M.Sprite>;
    cursor: number;
  }>(() => ({ frames: [M.Sprite.create()], cursor: 0 }));
  const [activeTool, setActiveTool] = React.useState<M.Tool>("pen");

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

  /** if `v` is a client position, the following will give the artboard
   * coordinates:
   *     vec2.transformMat2d(v, v, artboardClientTransform) */
  const artboardClientTransform = React.useMemo(() => {
    const out = mat2d.create();
    mat2d.fromScaling(
      out,
      vec2.div(vec2.create(), spriteSize, artboardClientSize)
    );
    return out;
  }, [spriteSize]);

  return (
    <div className={classNames(styles.container)}>
      <ArtboardInteractionHandler
        onDown={(artboardPos) => {
          pushHistory();
          setActiveSprite((prev) => {
            const out = M.Sprite.shallowClone(prev);
            M.Sprite.setPixelsRGBA(
              out,
              [vec2.toTuple(vec2.floor(vec2.create(), artboardPos))],
              activeTool === "pen" ? [255, 0, 0, 255] : [0, 0, 0, 0]
            );
            M.Sprite.updateEditHash(out);
            return out;
          });
        }}
        onMove={(artboardPos) => {
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
              activeTool === "pen" ? [255, 0, 0, 255] : [0, 0, 0, 0]
            );
            M.Sprite.updateEditHash(out);
            return out;
          });
        }}
        artboardClientTransform={artboardClientTransform}
      >
        {(handlers) => (
          <Artboard
            ref={artboardRef}
            {...handlers}
            className={classNames(styles.artboard)}
            style={{
              width: artboardClientSize[0],
              height: artboardClientSize[1],
            }}
            sprite={activeSprite}
            transform={artboardClientTransform}
          />
        )}
      </ArtboardInteractionHandler>
      <Toolbar
        className={styles.toolbar}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onSelectUndo={() => {
          setSpriteHistory((prev) => ({
            ...prev,
            cursor: Math.max(0, prev.cursor - 1),
          }));
        }}
        onSelectRedo={() => {
          setSpriteHistory((prev) => ({
            ...prev,
            cursor: Math.min(prev.frames.length - 1, prev.cursor + 1),
          }));
        }}
        onSelectExport={() => {
          const dataUri = artboardRef.current?.getDataURI();
          if (dataUri == null) {
            return;
          }
          downloadURI(dataUri, "da-update");
        }}
      />
    </div>
  );
}

function downloadURI(uri: string, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default App;
