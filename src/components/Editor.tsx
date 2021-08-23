import * as React from "react";
import classNames from "classnames";
import { useCustomCompareMemo } from "use-custom-compare";
import Artboard from "../components/Artboard";
// import Toolbar from "../components/Toolbar";
import Menubar from "../components/Menubar";
import Palette from "../components/Palette";
import Timeline from "../components/Timeline";
import Toast from "../components/Toast";
import CursorModeButtons from "../components/CursorModeButtons";
import * as M from "../model";
import styles from "./Editor.module.css";
import { ReadonlyVec2, ReadonlyMat2d, mat2d, vec2 } from "../utility/gl-matrix";
import arrayEquals from "../utility/arrayEquals";
import absurd from "../utility/absurd";
import { rgbaToCss } from "../utility/colors";
import {
  useMultiFingerPan,
  useDoubleTapGesture,
  combineBindHandlers,
  OnGestureStateChange,
} from "../utility/useGesture";
import useOnChange from "../utility/useOnChange";
import { Comparator } from "../utility/Comparator";

const TOOL_KEYMAPS: Array<[string, M.Tool]> = [
  ["1", "pen"],
  ["2", "eraser"],
  ["3", "bucket"],
  ["4", "grab"],
  ["5", "pickColor"],
];

interface Props {
  setActiveTool: (tool: M.Tool | null) => void;
  activeTool: M.Tool | null;

  animation: M.Animation;
  activeSprite: M.Sprite;

  activeColor: M.PixelContent;
  setActiveColor: (color: M.PixelContent) => void;

  willPerformUndoableEdit: () => void;
  paintPixels: (artboardPos: M.ReadonlyPixelVec2[]) => void;
  erasePixels: (artboardPos: M.ReadonlyPixelVec2[]) => void;
  fillAreaStartingAt: (artboardPos: M.ReadonlyPixelVec2) => void;
  translateSprite: (offset: M.ReadonlyPixelVec2) => void;
  pickColorAtLocation: (loc: M.ReadonlyPixelVec2) => void;

  undo: () => void;
  redo: () => void;
  addBlankAnimationFrame: () => void;
  duplicateCurrentAnimationFrame: () => void;
  setPlayhead: (index: number) => void;
  currentFrameIndex: number;
  cutFrame: () => void;
  copyFrame: () => void;
  pasteFrame: () => void;
  applyEditsAcrossSprites: boolean;
  setApplyEditsAcrossSprites: (v: boolean) => void;
}

export default function Editor({
  activeTool,
  setActiveTool,
  activeSprite,
  animation,
  activeColor,
  setActiveColor,
  paintPixels,
  fillAreaStartingAt,
  erasePixels,
  translateSprite,
  undo,
  redo,
  cutFrame,
  addBlankAnimationFrame,
  duplicateCurrentAnimationFrame,
  setPlayhead,
  currentFrameIndex,
  copyFrame,
  pasteFrame,
  willPerformUndoableEdit,
  pickColorAtLocation,
  applyEditsAcrossSprites,
}: // setApplyEditsAcrossSprites,
Props) {
  const [cursorClientPosition, setCursorClientPosition] =
    React.useState<ReadonlyVec2>([0, 0]);

  const [clientArtboardTransform, setClientArtboardTransform] =
    React.useState<ReadonlyMat2d>(() => mat2d.create());

  const [interactionMode, setInteractionMode] = React.useState<
    "cursor" | "direct"
  >("cursor");

  const [shouldAcceptTransformMouseInput, setShouldAcceptTransformMouseInput] =
    React.useState(false);

  React.useEffect(() => {
    if (applyEditsAcrossSprites) {
      document.body.classList.add(styles.mapEditsMode);
    } else {
      document.body.classList.remove(styles.mapEditsMode);
    }
  }, [applyEditsAcrossSprites]);

  const [exportAsFile] = useExportAsFileCallback({
    sprites: animation.sprites,
  });

  const artboardClientTransform = useCustomCompareMemo(
    () => mat2d.invert(mat2d.create(), clientArtboardTransform),
    [clientArtboardTransform],
    Comparator.flatten([mat2d.equals])
  );

  const [onCursorChanged] = useOnCursorChangedCallback({
    willPerformUndoableEdit,
    paintPixels,
    erasePixels,
    fillAreaStartingAt,
    pickColorAtLocation,
    translateSprite,
  });

  const { cursorPixelPosition, moveCursorClientPosition } = useCursor({
    cursorClientPosition,
    setCursorClientPosition,
    transform: artboardClientTransform,
    onCursorChanged,
    activeTool,
  });

  const artboardStageRef = React.useRef<React.ElementRef<"div">>(null);

  const { bindHandlers: bindDrag, artboardContainerRef } = useEditorPanGesture({
    interactionMode,
    setCursorClientPosition,
    moveCursorClientPosition,
    setClientArtboardTransform,
    forceTransform: shouldAcceptTransformMouseInput,
  });

  useHotkeyButtonPresses({ activeTool, setActiveTool });

  const cursorHighlightStyle = useCursorHighlightStyle({
    activeColor,
    cursorPixelPosition,
    activeSprite,
  });

  const revertToDefaultArtboardTransform = React.useCallback(() => {
    const out = mat2d.create();
    const artboardStage = artboardStageRef.current;
    if (artboardStage == null) {
      return;
    }

    const stageBounds = artboardStage.getBoundingClientRect();

    const stageCenter = vec2.fromSize(stageBounds);
    vec2.scale(stageCenter, stageCenter, 0.5);

    mat2d.translate(out, out, stageCenter);
    mat2d.scale(out, out, [16, 16]); // eyeballed

    // half the size of the untransformed artboard :|
    mat2d.translate(out, out, [-8, -8]);

    setClientArtboardTransform(out);
    setCursorClientPosition(stageCenter);
  }, []);

  const revertToDefaultArtboardTransformRef = React.useRef(
    revertToDefaultArtboardTransform
  );
  React.useLayoutEffect(
    () => revertToDefaultArtboardTransformRef.current(),
    []
  );

  const zoomArtboard = React.useCallback(
    (amount: number, center: ReadonlyVec2) => {
      setClientArtboardTransform((prev) => {
        const out = mat2d.clone(prev);
        const offset = vec2.transformMat2d(
          vec2.create(),
          center,
          mat2d.invert(mat2d.create(), out)
        );
        mat2d.translate(out, out, offset);
        mat2d.scale(out, out, [amount, amount]);
        mat2d.translate(out, out, vec2.negate(vec2.create(), offset));
        return out;
      });
    },
    []
  );

  React.useEffect(() => {
    const keyDownListener = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        setShouldAcceptTransformMouseInput(true);
      }
    };
    const keyUpListener = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setShouldAcceptTransformMouseInput(false);
      }
    };

    if (shouldAcceptTransformMouseInput) {
      document.addEventListener("keyup", keyUpListener);
    } else {
      document.addEventListener("keydown", keyDownListener);
    }
    return () => {
      if (shouldAcceptTransformMouseInput) {
        document.removeEventListener("keyup", keyUpListener);
      } else {
        document.removeEventListener("keydown", keyDownListener);
      }
    };
  }, [zoomArtboard, shouldAcceptTransformMouseInput]);

  React.useEffect(() => {
    const wheelListener = (event: WheelEvent) => {
      if (!shouldAcceptTransformMouseInput) {
        return;
      }
      event.preventDefault();
      const scaleFactor = Math.pow(1.005, event.deltaY);
      const focus = vec2.fromClientPosition(event);
      zoomArtboard(scaleFactor, focus);
    };

    document.addEventListener("wheel", wheelListener, { passive: false });
    return () => {
      document.removeEventListener("wheel", wheelListener);
    };
  }, [zoomArtboard, shouldAcceptTransformMouseInput]);

  const onDoubleTapGestureChange: OnGestureStateChange<
    typeof useDoubleTapGesture
  > = React.useCallback(
    (phase, state) => {
      if (phase !== "active") {
        return;
      }
      if (state.becameActiveAt == null) {
        return;
      }
      revertToDefaultArtboardTransform();
    },
    [revertToDefaultArtboardTransform]
  );

  const { bindHandlers: bindDoubleTap } = useDoubleTapGesture({
    onGestureStateChange: onDoubleTapGestureChange,
  });

  const bindAllHandlers = React.useMemo(
    () => combineBindHandlers([bindDrag, bindDoubleTap]),
    [bindDrag, bindDoubleTap]
  );

  return (
    <div className={classNames(styles.container)}>
      <div className={styles.mainWindow}>
        <div
          ref={artboardStageRef}
          className={styles.artboardStage}
          onMouseDown={(event) => {
            const pt = vec2.fromClientPosition(event);
            const m = mat2d.invert(mat2d.create(), clientArtboardTransform);
            vec2.transformMat2d(pt, pt, m);
          }}
          {...bindAllHandlers()}
        >
          <div
            ref={artboardContainerRef}
            className={classNames(styles.artboardContainer)}
            style={{
              ...vec2.toSize(M.Sprite.getSize(activeSprite)),
              transform: mat2d.toCSSInstruction(clientArtboardTransform),
            }}
          >
            <Artboard className={styles.artboard} sprite={activeSprite} />
            <div className={styles.highlight} style={cursorHighlightStyle} />
          </div>
          {interactionMode === "cursor" ? (
            <div
              className={styles.cursor}
              style={vec2.toLeftTop(cursorClientPosition)}
            />
          ) : (
            <></>
          )}
        </div>
        <div className={styles.colorGroup}>
          <Palette onSelectColor={setActiveColor} selectedColor={activeColor} />
        </div>
        <Menubar
          className={styles.menubar}
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
              case "cut-frame":
                return cutFrame();
              case "copy-frame":
                return copyFrame();
              case "paste-frame":
                return pasteFrame();
              default:
                return absurd(button);
            }
          }}
        />
        {interactionMode === "cursor" && (
          <CursorModeButtons
            className={styles.cursorModeButtons}
            toolSet={["bucket", "pickColor", "eraser", "pen"]}
            onButtonChanged={(isDown, buttonType) => {
              if (isDown) {
                setActiveTool(buttonType);
              } else {
                setActiveTool(null);
              }
            }}
          />
        )}
      </div>
      <Timeline
        className={styles.timeline}
        sprites={animation.sprites}
        selectedFrameIndex={currentFrameIndex}
        onSelectFrame={setPlayhead}
        onRequestAddFrame={({ duplicateSelected }) => {
          if (duplicateSelected) {
            duplicateCurrentAnimationFrame();
          } else {
            addBlankAnimationFrame();
          }
        }}
      />
      <Toast
        message={(() => {
          switch (activeTool) {
            case null:
              return <>No tool selected</>;

            case "pen":
              return (
                <>
                  <b>Pen tool:</b> Drag on sprite to replace pixels with a
                  color.
                </>
              );

            case "bucket":
              return (
                <>
                  <b>Fill tool:</b> Drag on sprite to fill an area with a color.
                </>
              );

            case "eraser":
              return (
                <>
                  <b>Eraser:</b> Drag on sprite to erase existing pixels.
                </>
              );

            case "grab":
              return (
                <>
                  <b>Move tool:</b> Drag on sprite to translate the entire
                  sprite.
                </>
              );

            case "pickColor":
              return (
                <>
                  <b>Sample tool:</b> Drag on sprite to pick a color from an
                  existing pixel.
                </>
              );

            default:
              return "";
          }
        })()}
        hidden={activeTool == null}
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

function dataUriForSpriteSheet(
  sprites: M.Sprite[],
  canvas: HTMLCanvasElement
): string {
  const [sheetWidth, sheetHeight] = sprites.reduce(
    ([width, height], sprite) => {
      const [spriteWidth, spriteHeight] = M.Sprite.getSize(sprite);
      return [Math.max(spriteWidth, width), spriteHeight + height];
    },
    [0, 0]
  );

  const imageData = new ImageData(sheetWidth, sheetHeight);

  let sheetBufferOffsetForCurrentSprite = 0;
  for (const sprite of sprites) {
    imageData.data.set(
      sprite.imageData.data,
      sheetBufferOffsetForCurrentSprite
    );

    const [spriteWidth, spriteHeight] = M.Sprite.getSize(sprite);
    sheetBufferOffsetForCurrentSprite += spriteHeight * spriteWidth * 4;
  }

  canvas.width = sheetWidth;
  canvas.height = sheetHeight;

  canvas.getContext("2d")!.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
}

// --- Custom hooks

function useCursorHighlightStyle({
  activeColor,
  cursorPixelPosition,
  activeSprite,
}: {
  activeColor: M.PixelContent;
  cursorPixelPosition: M.ReadonlyPixelVec2;
  activeSprite: M.Sprite;
}) {
  return useCustomCompareMemo(
    (): React.CSSProperties => {
      const [spriteWidth, spriteHeight] = M.Sprite.getSize(activeSprite);
      return {
        ...vec2.toLeftTop(cursorPixelPosition),
        backgroundColor: rgbaToCss(activeColor),
        width: `${100 / spriteWidth}%`,
        height: `${100 / spriteHeight}%`,
        visibility: M.Sprite.isPointInside(activeSprite, cursorPixelPosition)
          ? "visible"
          : "hidden",
      };
    },
    [activeColor, cursorPixelPosition, activeSprite],
    (
      [prevColor, prevAbsCursorPos, ...prevRest],
      [nextColor, nextAbsCursorPos, ...nextRest]
    ) =>
      arrayEquals(prevColor, nextColor) &&
      vec2.equals(prevAbsCursorPos, nextAbsCursorPos) &&
      arrayEquals(prevRest, nextRest)
  );
}

function useExportAsFileCallback({
  sprites,
}: {
  sprites: M.Sprite[];
}): [() => void] {
  return [
    React.useCallback(() => {
      downloadURI(
        dataUriForSpriteSheet(sprites, document.createElement("canvas")),
        "da-update"
      );
    }, [sprites]),
  ];
}

type CursorState = {
  position: M.ReadonlyPixelVec2;
  activeTool: M.Tool | null;
};

type OnCursorChangedCallback = (
  currentState: CursorState,
  previousState: CursorState
) => void;

function useCursor({
  onCursorChanged,
  transform,
  cursorClientPosition,
  setCursorClientPosition,
  activeTool,
}: {
  onCursorChanged: OnCursorChangedCallback;
  transform: ReadonlyMat2d;
  cursorClientPosition: ReadonlyVec2;
  setCursorClientPosition: React.Dispatch<React.SetStateAction<ReadonlyVec2>>;
  activeTool: M.Tool | null;
}): {
  moveCursorClientPosition: (delta: ReadonlyVec2) => void;
  cursorPixelPosition: M.ReadonlyPixelVec2;
} {
  const artboardCursorPosition = vec2.transformMat2d(
    vec2.create(),
    cursorClientPosition,
    transform
  );

  const cursorPixelPosition = artboardCursorPosition.map(Math.floor) as [
    number,
    number
  ];

  useOnChange(
    ([prevCursorPixelPosition, prevTool]) => {
      onCursorChanged(
        {
          position: cursorPixelPosition,
          activeTool,
        },
        {
          position: prevCursorPixelPosition,
          activeTool: prevTool,
        }
      );
    },
    [cursorPixelPosition, activeTool, onCursorChanged],
    ([prevPos, ...prevDeps], [nextPos, ...nextDeps]) =>
      arrayEquals(prevPos, nextPos) && arrayEquals(prevDeps, nextDeps)
  );

  const moveCursorClientPosition = React.useCallback(
    (delta: ReadonlyVec2) => {
      setCursorClientPosition((prev) => vec2.add(vec2.create(), prev, delta));
    },
    [setCursorClientPosition]
  );

  return {
    moveCursorClientPosition,
    cursorPixelPosition,
  };
}

function useOnCursorChangedCallback({
  willPerformUndoableEdit,
  paintPixels,
  erasePixels,
  fillAreaStartingAt,
  pickColorAtLocation,
  translateSprite,
}: {
  willPerformUndoableEdit: () => void;
  paintPixels: (artboardPos: M.ReadonlyPixelVec2[]) => void;
  translateSprite: (offset: M.ReadonlyPixelVec2) => void;
  pickColorAtLocation: (loc: M.PixelLocation) => void;
  erasePixels: (artboardPos: M.ReadonlyPixelVec2[]) => void;
  fillAreaStartingAt: (artboardPos: M.ReadonlyPixelVec2) => void;
}): [OnCursorChangedCallback] {
  return [
    React.useCallback(
      (
        { position, activeTool },
        { position: prevPosition, activeTool: prevTool }
      ) => {
        if (activeTool == null) {
          return;
        }

        const [prevCursorX, prevCursorY] = prevPosition;
        const cursorPixelPosition = position.map(Math.floor) as [
          number,
          number
        ];
        const prevCursorPixelPosition = prevPosition.map(Math.floor) as [
          number,
          number
        ];
        if (
          activeTool === prevTool &&
          arrayEquals(cursorPixelPosition, prevCursorPixelPosition)
        ) {
          // avoid causing updates when cursor has not meaningfully changed
          return;
        }

        if (activeTool != null && activeTool !== prevTool) {
          willPerformUndoableEdit();
        }

        switch (activeTool) {
          case "pen":
            paintPixels([cursorPixelPosition]);
            break;

          case "eraser":
            erasePixels([cursorPixelPosition]);
            break;

          case "bucket":
            fillAreaStartingAt(cursorPixelPosition);
            break;

          case "grab":
            const [cursorX, cursorY] = cursorPixelPosition;
            const offset = [
              cursorX - prevCursorX,
              cursorY - prevCursorY,
            ] as const;
            translateSprite(offset);
            break;

          case "pickColor":
            pickColorAtLocation(cursorPixelPosition);
            break;

          default:
            return absurd(activeTool);
        }
      },
      [
        paintPixels,
        pickColorAtLocation,
        translateSprite,
        erasePixels,
        fillAreaStartingAt,
      ]
    ),
  ];
}

function useHotkeyButtonPresses({
  setActiveTool,
  activeTool,
}: {
  setActiveTool: (tool: M.Tool | null) => void;
  activeTool: M.Tool | null;
}) {
  const globalKeyDownHandler = React.useCallback(
    (event: KeyboardEvent) => {
      for (const [matchKey, tool] of TOOL_KEYMAPS) {
        if (event.key === matchKey && activeTool !== tool) {
          console.log("setting active tool", tool);
          setActiveTool(tool);
        }
      }
    },
    [setActiveTool, activeTool]
  );
  const globalKeyUpHandler = React.useCallback(
    (event: KeyboardEvent) => {
      if (TOOL_KEYMAPS.map(([matchKey]) => matchKey).includes(event.key)) {
        setActiveTool(null);
      }
    },
    [setActiveTool]
  );

  React.useEffect(() => {
    window.addEventListener("keydown", globalKeyDownHandler);
    window.addEventListener("keyup", globalKeyUpHandler);

    return () => {
      window.removeEventListener("keydown", globalKeyDownHandler);
      window.removeEventListener("keyup", globalKeyUpHandler);
    };
  }, [globalKeyDownHandler, globalKeyUpHandler]);
}

function useEditorPanGesture({
  setCursorClientPosition,
  moveCursorClientPosition,
  interactionMode,
  setClientArtboardTransform,
  forceTransform,
}: {
  setCursorClientPosition: (nextPosition: ReadonlyVec2) => void;
  moveCursorClientPosition: (delta: ReadonlyVec2) => void;
  interactionMode: "direct" | "cursor";
  setClientArtboardTransform: React.Dispatch<
    React.SetStateAction<ReadonlyMat2d>
  >;
  forceTransform: boolean;
}): {
  bindHandlers: () => any;
  artboardContainerRef: React.Ref<HTMLDivElement>;
} {
  const bcrRef = React.useRef<DOMRect>(new DOMRect());

  const prevPositionRef = React.useRef<ReadonlyVec2 | null>(null);
  const prevTransformPointersRef = React.useRef<{
    [pointerId: string]: { position: ReadonlyVec2 };
  }>({});

  const artboardContainerRef = React.useRef<React.ElementRef<"div">>(null);

  const onGestureStateChange: OnGestureStateChange<typeof useMultiFingerPan> =
    React.useCallback(
      (phase, state) => {
        if (phase !== "active") {
          prevPositionRef.current = null;
          prevTransformPointersRef.current = {};
          if (interactionMode === "direct") {
            // TODO
            // setButtonPressed(1, false);
          }
          return;
        }

        const pointerStates = Object.keys(state.pointers).map(
          (k) => state.pointers[k]
        );

        const shouldMoveCursor = !forceTransform && pointerStates.length === 1;
        const shouldTransformViewport =
          forceTransform || pointerStates.length > 1;

        if (shouldMoveCursor) {
          const pointerState = pointerStates[0];
          bcrRef.current = pointerState.currentTarget.getBoundingClientRect();
          if (interactionMode === "direct") {
            setCursorClientPosition(pointerState.position);
            // TODO
            // setButtonPressed(1, true);
          } else {
            const delta =
              prevPositionRef.current == null
                ? null
                : vec2.sub(
                    vec2.create(),
                    pointerState.position,
                    prevPositionRef.current
                  );
            if (delta != null) {
              moveCursorClientPosition(delta);
            }
          }

          prevPositionRef.current = pointerState.position;
        } else {
          prevPositionRef.current = null;
        }

        if (shouldTransformViewport) {
          const prevPointerPositions = prevTransformPointersRef.current;

          const groupedPointerPositions = (() => {
            const out: Array<[ReadonlyVec2, ReadonlyVec2]> = [];
            for (const pId of Object.keys(prevPointerPositions)) {
              if (state.pointers[pId] != null) {
                out.push([
                  prevPointerPositions[pId].position,
                  state.pointers[pId].position,
                ]);
              }
            }
            return out;
          })();

          if (groupedPointerPositions.length > 0) {
            const transform = mat2d.nudgedEstimate(
              mat2d.create(),
              groupedPointerPositions
            );
            setClientArtboardTransform((prev) =>
              mat2d.mul(mat2d.create(), transform, prev)
            );
          }

          prevTransformPointersRef.current = state.pointers;
        } else {
          prevTransformPointersRef.current = {};
        }
      },
      [
        forceTransform,
        interactionMode,
        moveCursorClientPosition,
        setClientArtboardTransform,
        setCursorClientPosition,
      ]
    );

  const { bindHandlers } = useMultiFingerPan({ onGestureStateChange });

  return { bindHandlers, artboardContainerRef };
}
