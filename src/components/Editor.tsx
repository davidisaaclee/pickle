import * as React from "react";
import classNames from "classnames";
import {
  useCustomCompareMemo,
  useCustomCompareEffect,
} from "use-custom-compare";
import * as Gesture from "@use-gesture/react";
import Artboard from "../components/Artboard";
import Toolbar from "../components/Toolbar";
import Palette from "../components/Palette";
import Timeline from "../components/Timeline";
import * as M from "../model";
import styles from "./Editor.module.css";
import { ReadonlyVec2, Vec2, mat2d, vec2 } from "../utility/gl-matrix";
import { useValueFromInnerWindowSize } from "../utility/useWindowResize";
import arrayEquals from "../utility/arrayEquals";
import absurd from "../utility/absurd";

interface Props {
  setActiveTool: (tool: M.Tool) => void;
  activeTool: M.Tool;

  animation: M.Animation;
  activeSprite: M.Sprite;

  setActiveColor: (color: M.PixelContent) => void;

  beginPaint: (artboardPos: readonly [number, number]) => void;
  paintPixels: (artboardPos: readonly [number, number]) => void;

  undo: () => void;
  redo: () => void;
  addBlankAnimationFrame: () => void;
  setPlayhead: (index: number) => void;
  currentFrameIndex: number;
}

export default function Editor({
  setActiveTool,
  activeTool,
  activeSprite,
  animation,
  setActiveColor,
  beginPaint,
  paintPixels,
  undo,
  redo,
  addBlankAnimationFrame,
  setPlayhead,
  currentFrameIndex,
}: Props) {
  const [interactionMode, setInteractionMode] = React.useState<
    "cursor" | "direct"
  >("direct");
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
    (gestureState: Gesture.DragState) => {
      if (gestureState.target instanceof HTMLElement) {
        bcrRef.current = gestureState.target.getBoundingClientRect();
      }
      const pt = locationFromClientPosition(gestureState.xy);
      if (interactionMode === "direct") {
        beginPaint(pt);
      }
      prevPositionRef.current = pt;
    },
    [locationFromClientPosition, beginPaint, interactionMode]
  );

  const onArtboardPan = React.useCallback(
    (gestureState: Gesture.DragState) => {
      const pt = locationFromClientPosition(gestureState.xy);
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

  const bindDrag = Gesture.useDrag((state) => {
    if (state.first) {
      onArtboardPanStart(state);
    } else {
      onArtboardPan(state);
    }
  });

  return (
    <div className={classNames(styles.container)}>
      <div {...bindDrag()} className={styles.artboardStage}>
        <div
          className={classNames(styles.artboardContainer)}
          style={{
            width: artboardClientSize[0],
            height: artboardClientSize[1],
          }}
        >
          <Artboard
            className={styles.artboard}
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
            case "toggle-cursor":
              return setInteractionMode((prev) =>
                prev === "cursor" ? "direct" : "cursor"
              );
            case "add-frame":
              return addBlankAnimationFrame();
            default:
              return absurd(button);
          }
        }}
      />
      <Palette className={styles.palette} onSelectColor={setActiveColor} />
      <Timeline
        className={styles.timeline}
        sprites={animation.sprites}
        selectedFrameIndex={currentFrameIndex}
        onSelectFrame={(index) => {
          setPlayhead(index);
        }}
      />
      {interactionMode === "cursor" && (
        <div
          className={styles.cursorButton}
          data-pressed={isCursorPressed}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.stopPropagation();
            setIsCursorPressed(true);
            beginPaint(cursorPosition);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            event.stopPropagation();
            setIsCursorPressed(false);
          }}
        >
          Paint
        </div>
      )}
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
