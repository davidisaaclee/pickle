import * as React from "react";
import classNames from "classnames";
import Artboard from "../components/Artboard";
import ArtboardInteractionHandler from "../components/ArtboardInteractionHandler";
import Toolbar from "../components/Toolbar";
import Palette from "../components/Palette";
import * as M from "../model";
import styles from "./Editor.module.css";
import { ReadonlyVec2, mat2d, vec2 } from "../utility/gl-matrix";
import { useValueFromInnerWindowSize } from "../utility/useWindowResize";

interface Props {
  setActiveTool: (tool: M.Tool) => void;
  activeTool: M.Tool;

  activeSprite: M.Sprite;

  setActiveColor: (color: M.PixelContent) => void;

  beginPaint: (artboardPos: readonly [number, number]) => void;
  paintPixels: (artboardPos: readonly [number, number]) => void;

  undo: () => void;
  redo: () => void;
}

export default function Editor({
  setActiveTool,
  activeTool,
  activeSprite,
  setActiveColor,
  beginPaint,
  paintPixels,
  undo,
  redo,
}: Props) {
  const artboardRef = React.useRef<React.ElementRef<typeof Artboard>>(null);

  const artboardClientSize = useValueFromInnerWindowSize<[number, number]>(
    ([width, height]) => {
      const minorLength = Math.min(width, height);
      return [minorLength * 0.5, minorLength * 0.5];
    }
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
  }, [spriteSize, artboardClientSize]);

  const exportAsFile = React.useCallback(() => {
    const dataUri = artboardRef.current?.getDataURI();
    if (dataUri == null) {
      return;
    }
    downloadURI(dataUri, "da-update");
  }, []);

  const [cursorPosition, setCursorPosition] = React.useState<ReadonlyVec2>(
    vec2.fromValues(5, 5)
  );

  const absoluteCursorPosition = React.useMemo(
    () =>
      vec2.transformMat2d(
        vec2.create(),
        cursorPosition,
        mat2d.invert(mat2d.create(), artboardClientTransform)
      ),
    [cursorPosition, artboardClientTransform]
  );

  return (
    <div className={classNames(styles.container)}>
      <ArtboardInteractionHandler
        onDown={beginPaint}
        onDrag={paintPixels}
        onMove={setCursorPosition}
        artboardClientTransform={artboardClientTransform}
      >
        {(handlers) => (
          <>
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
            >
              <div
                style={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  backgroundColor: "black",
                  transform: ["translate(-50%, -50%)"].join(" "),
                  ...vec2.toLeftTop(absoluteCursorPosition),
                }}
              />
            </Artboard>
          </>
        )}
      </ArtboardInteractionHandler>
      <Toolbar
        className={styles.toolbar}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onSelectUndo={undo}
        onSelectRedo={redo}
        onSelectExport={exportAsFile}
      />
      <Palette className={styles.palette} onSelectColor={setActiveColor} />
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
