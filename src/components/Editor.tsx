import { noop } from "lodash";
import * as React from "react";
import classNames from "classnames";
import { useCustomCompareMemo } from "use-custom-compare";
import Artboard from "../components/Artboard";
import Toolbar from "../components/Toolbar";
import Palette from "../components/Palette";
import * as M from "../model";
import styles from "./Editor.module.css";
import { Vec2, mat2d, vec2 } from "../utility/gl-matrix";
import { PointerHandlers } from "../utility/PointerHandlers";
import { useValueFromInnerWindowSize } from "../utility/useWindowResize";
import arrayEquals from "../utility/arrayEquals";

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
  const [interactionMode] = React.useState<"cursor" | "direct">("cursor");

  const artboardRef = React.useRef<React.ElementRef<typeof Artboard>>(null);

  const artboardClientSize = useValueFromInnerWindowSize<[number, number]>(
    ([width, height]) => {
      const minorLength = Math.min(width, height);
      return [minorLength * 0.5, minorLength * 0.5];
    }
  );

  const spriteSize = M.Sprite.getSize(activeSprite);

  /** if `v` is a client position (relative to `Artboard`), the following will
   * give the artboard coordinates:
   *     vec2.transformMat2d(v, v, artboardClientTransform) */
  const artboardClientTransform = useCustomCompareMemo(
    () => {
      const out = mat2d.create();
      mat2d.fromScaling(
        out,
        vec2.div(vec2.create(), spriteSize, artboardClientSize)
      );
      return out;
    },
    [spriteSize, artboardClientSize],
    ([prevSize, ...prevRest], [nextSize, ...nextRest]) =>
      arrayEquals(prevSize, nextSize) && arrayEquals(prevRest, nextRest)
  );

  const exportAsFile = React.useCallback(() => {
    const dataUri = artboardRef.current?.getDataURI();
    if (dataUri == null) {
      return;
    }
    downloadURI(dataUri, "da-update");
  }, []);

  const [cursorPosition, setCursorPosition] = React.useState<[number, number]>([
    5, 5,
  ]);

  const absoluteCursorPosition = useCustomCompareMemo(
    () =>
      vec2.transformMat2d(
        vec2.create(),
        cursorPosition,
        mat2d.invert(mat2d.create(), artboardClientTransform)
      ),
    [cursorPosition, artboardClientTransform],
    ([prevPos, prevTransform], [nextPos, nextTransform]) =>
      arrayEquals(prevPos, nextPos) &&
      mat2d.equals(prevTransform, nextTransform)
  );

  const moveCursor = React.useCallback(
    (_pos, delta: M.PixelVec2 | null) => {
      if (delta == null) {
        return;
      }
      const [dx, dy] = delta;
      setCursorPosition(([prevX, prevY]) => [prevX + dx, prevY + dy]);
      paintPixels(cursorPosition);
    },
    [cursorPosition]
  );

  //
  // TODO: cursor movement is bad perforance: i think unrolling
  // ArtboardInteractionHandler will reduce a lot of renders
  //

  const bcrRef = React.useRef<DOMRect>(new DOMRect());

  const prevPositionRef = React.useRef<[number, number] | null>(null);

  // mutates input
  const convertClientPositionToArtboard = React.useCallback(
    (clientPos: Vec2): void => {
      vec2.sub(clientPos, clientPos, vec2.fromLeftTop(bcrRef.current));
      vec2.transformMat2d(clientPos, clientPos, artboardClientTransform);
    },
    [artboardClientTransform]
  );

  const locationFromPointerEvent = React.useCallback(
    (event: React.PointerEvent): M.PixelLocation => {
      const clientLoc = vec2.fromClientPosition(event);
      convertClientPositionToArtboard(clientLoc);
      return vec2.toTuple(clientLoc);
    },
    [convertClientPositionToArtboard]
  );

  React.useEffect(() => {
    console.log("change");
  }, [
    locationFromPointerEvent, //
    // onMove, //
    // onDrag, //
    // onDown, //
    // onUp, //
  ]);

  const onDown = React.useMemo(
    () => (interactionMode === "direct" ? beginPaint : noop),
    [interactionMode, beginPaint]
  );
  const onDrag = React.useMemo(
    () => (interactionMode === "direct" ? paintPixels : moveCursor),
    [interactionMode, paintPixels, moveCursor]
  );

  const handlers = React.useMemo((): PointerHandlers => {
    return {
      onPointerDown(event) {
        bcrRef.current = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);

        const pt = locationFromPointerEvent(event);
        onDown(pt);
        prevPositionRef.current = pt;
      },
      onPointerUp(event) {
        event.currentTarget.releasePointerCapture(event.pointerId);

        const pt = locationFromPointerEvent(event);
        // onUp(pt);
        prevPositionRef.current = pt;
      },
      onPointerMove(event) {
        const pt = locationFromPointerEvent(event);
        const delta =
          prevPositionRef.current == null
            ? null
            : ([
                pt[0] - prevPositionRef.current[0],
                pt[1] - prevPositionRef.current[1],
              ] as [number, number]);
        // onMove(pt, delta);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          onDrag(pt, delta);
        }
        prevPositionRef.current = pt;
      },
    };
  }, [locationFromPointerEvent, onDrag, onDown]);

  return (
    <div className={classNames(styles.container)} {...handlers}>
      <div
        className={classNames(styles.artboard)}
        style={{
          width: artboardClientSize[0],
          height: artboardClientSize[1],
        }}
      >
        <Artboard
          ref={artboardRef}
          sprite={activeSprite}
          transform={artboardClientTransform}
        />
        {interactionMode === "cursor" ? (
          <div
            style={{
              position: "absolute",
              width: 10,
              height: 10,
              borderRadius: 6,
              border: "1px solid black",
              backgroundColor: "hsla(0, 0%, 100%, 50%)",
              boxShadow: "0 0 2px hsla(0, 0%, 0%, 70%)",
              transform: ["translate(-50%, -50%)"].join(" "),
              ...vec2.toLeftTop(absoluteCursorPosition),
            }}
          />
        ) : (
          <></>
        )}
      </div>
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
