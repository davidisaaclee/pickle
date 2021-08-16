import { noop } from "lodash";
import * as React from "react";
import classNames from "classnames";
import {
  useCustomCompareMemo,
  useCustomCompareEffect,
} from "use-custom-compare";
import { useDrag } from "@use-gesture/react";
import ReactHammer from "react-hammerjs";
import * as Hammer from "hammerjs";
import Artboard from "../components/Artboard";
import Toolbar from "../components/Toolbar";
import Palette from "../components/Palette";
import * as M from "../model";
import styles from "./Editor.module.css";
import { ReadonlyVec2, Vec2, mat2d, vec2 } from "../utility/gl-matrix";
import { useValueFromInnerWindowSize } from "../utility/useWindowResize";
import arrayEquals from "../utility/arrayEquals";
import absurd from "../utility/absurd";

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
  const [isCursorPressed, setIsCursorPressed] = React.useState(false);

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
      console.log("movecursor", _pos, delta);
      if (delta == null) {
        return;
      }
      const [dx, dy] = delta;
      setCursorPosition(([prevX, prevY]) => [prevX + dx, prevY + dy]);
    },
    [setCursorPosition]
  );

  const cursorPixelPosition = cursorPosition.map(Math.floor) as [
    number,
    number
  ];
  useCustomCompareEffect(
    () => {
      if (isCursorPressed) {
        paintPixels(cursorPixelPosition);
      }
    },
    [cursorPixelPosition, isCursorPressed, paintPixels],
    ([prevPos, ...prevDeps], [nextPos, ...nextDeps]) =>
      arrayEquals(prevPos, nextPos) && arrayEquals(prevDeps, nextDeps)
  );

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

  const locationFromClientPosition = React.useCallback(
    (clientLoc: ReadonlyVec2): M.PixelLocation => {
      const p = vec2.clone(clientLoc);
      convertClientPositionToArtboard(p);
      return vec2.toTuple(p);
    },
    [convertClientPositionToArtboard]
  );

  const onArtboardPanStart = React.useCallback(
    (event: typeof Hammer.Input) => {
      bcrRef.current = event.target.getBoundingClientRect();
      const pt = locationFromClientPosition(vec2.fromXY(event.center));
      if (interactionMode === "direct") {
        beginPaint(pt);
      }
      prevPositionRef.current = pt;
    },
    [locationFromClientPosition, beginPaint, interactionMode]
  );

  const onArtboardPan = React.useCallback(
    (event: typeof Hammer.Input) => {
      const pt = locationFromClientPosition(vec2.fromXY(event.center));
      if (interactionMode === "direct") {
        paintPixels(pt);
      } else {
        const delta =
          prevPositionRef.current == null
            ? null
            : ([
                pt[0] - prevPositionRef.current[0],
                pt[1] - prevPositionRef.current[1],
              ] as [number, number]);
        moveCursor(pt, delta);
      }
      prevPositionRef.current = pt;
    },
    [locationFromClientPosition, paintPixels, moveCursor, interactionMode]
  );

  const panHandlerRef =
    React.useRef<React.ElementRef<typeof ReactHammer>>(null);

  return (
    <ReactHammer
      ref={panHandlerRef}
      onPanStart={onArtboardPanStart}
      onPan={onArtboardPan}
      options={{
        touchAction: "none",
      }}
    >
      <div className={classNames(styles.container)}>
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
              className={styles.cursor}
              style={vec2.toLeftTop(absoluteCursorPosition)}
            />
          ) : (
            <></>
          )}
        </div>
        <Toolbar
          className={styles.toolbar}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onTapButton={(button) => {
            switch (button) {
              case "undo":
                return undo();
              case "redo":
                return redo();
              case "export":
                return exportAsFile();
              default:
                return absurd(button);
            }
          }}
        />
        <Palette className={styles.palette} onSelectColor={setActiveColor} />
        {interactionMode === "cursor" && (
          <ReactHammer
            recognizeWith={{
              pan: panHandlerRef.current!,
            }}
            onPress={(event) => {
              setIsCursorPressed(true);
              beginPaint(cursorPosition);
              // event.stopPropagation();
            }}
            onPressUp={() => {
              setIsCursorPressed(false);
            }}
          >
            <div className={styles.cursorButton}>Paint</div>
          </ReactHammer>
        )}
      </div>
    </ReactHammer>
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
