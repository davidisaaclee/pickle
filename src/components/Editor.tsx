import * as React from "react";
import classNames from "classnames";
import { useCustomCompareMemo } from "use-custom-compare";
import Artboard from "../components/Artboard";
import Toolbar from "../components/Toolbar";
import Menubar from "../components/Menubar";
import Palette from "../components/Palette";
import Timeline from "../components/Timeline";
import CursorModeButtons from "../components/CursorModeButtons";
import * as M from "../model";
import styles from "./Editor.module.css";
import {
  ReadonlyVec2,
  ReadonlyMat2d,
  Vec2,
  mat2d,
  vec2,
} from "../utility/gl-matrix";
import { useValueFromInnerWindowSize } from "../utility/useWindowResize";
import arrayEquals from "../utility/arrayEquals";
import absurd from "../utility/absurd";
import { rgbaToCss } from "../utility/colors";
import usePan, { PanEvent } from "../utility/usePan";
import useOnChange from "../utility/useOnChange";

const primaryButtons = {
  pen: { title: "Paint", key: "paint" },
  eraser: { title: "Erase", key: "erase" },
  bucket: { title: "Fill", key: "fill" },
} as const;
const secondaryButtons = {
  pen: { title: "Pick color", key: "pick-color" },
  eraser: { title: "---", key: null },
  bucket: { title: "Move", key: "move" },
} as const;

interface Props {
  setActiveTool: (tool: M.Tool) => void;
  activeTool: M.Tool;

  animation: M.Animation;
  activeSprite: M.Sprite;

  activeColor: M.PixelContent;
  setActiveColor: (color: M.PixelContent) => void;

  beginPaint: (artboardPos: M.ReadonlyPixelVec2) => void;
  paintPixels: (artboardPos: M.ReadonlyPixelVec2) => void;
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
  setActiveTool,
  activeTool,
  activeSprite,
  animation,
  activeColor,
  setActiveColor,
  beginPaint,
  paintPixels,
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
  pickColorAtLocation,
  applyEditsAcrossSprites,
  setApplyEditsAcrossSprites,
}: Props) {
  const [interactionMode, setInteractionMode] = React.useState<
    "cursor" | "direct"
  >("cursor");

  React.useEffect(() => {
    if (applyEditsAcrossSprites) {
      document.body.classList.add(styles.mapEditsMode);
    } else {
      document.body.classList.remove(styles.mapEditsMode);
    }
  }, [applyEditsAcrossSprites]);

  const artboardClientSize = useValueFromInnerWindowSize<[number, number]>(
    ([width, height]) => {
      const minorLength = Math.min(width, height);
      return [minorLength * 0.7, minorLength * 0.7];
    }
  );

  /** if `v` is a client position (relative in translation to `Artboard`'s
   * origin), the following will give the artboard coordinates (translation and
   * scale relative to pixels):
   *     vec2.transformMat2d(v, v, artboardClientTransform) */
  const [artboardClientTransform] = useArtboardClientTransform({
    spriteSize: M.Sprite.getSize(activeSprite),
    artboardClientSize,
  });

  const [exportAsFile] = useExportAsFileCallback({
    sprites: animation.sprites,
  });

  const [onCursorChanged] = useOnCursorChangedCallback({
    beginPaint,
    paintPixels,
    pickColorAtLocation,
    translateSprite,
    activeTool,
  });

  const {
    absoluteCursorPixelPosition,
    absoluteCursorPosition,
    cursorPixelPosition,
    setCursorPosition,
    moveCursorPosition,
    isButtonPressed,
    setButtonPressed,
  } = useCursor({
    initialCursorPosition: [5, 5],
    transform: artboardClientTransform,
    onCursorChanged,
  });

  const {
    bindHandlers: bindDrag,
    panGestureTargetRef,
    artboardContainerRef,
  } = useEditorPanGesture({
    transform: artboardClientTransform,
    setButtonPressed,
    interactionMode,
    setCursorPosition,
    moveCursorPosition,
  });

  useHotkeyButtonPresses({ isButtonPressed, setButtonPressed });

  const cursorHighlightStyle = useCursorHighlightStyle({
    activeColor,
    absoluteCursorPixelPosition,
    cursorPixelPosition,
    activeSprite,
  });

  return (
    <div className={classNames(styles.container)}>
      <div className={styles.mainWindow}>
        <div
          ref={panGestureTargetRef}
          className={styles.artboardStage}
          {...bindDrag()}
        >
          <div
            ref={artboardContainerRef}
            className={classNames(styles.artboardContainer)}
            style={{
              width: artboardClientSize[0],
              height: artboardClientSize[1],
            }}
          >
            <Artboard
              className={styles.artboard}
              sprite={activeSprite}
              transform={artboardClientTransform}
            />
            <div className={styles.highlight} style={cursorHighlightStyle} />
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
        <div className={styles.colorGroup}>
          <Palette onSelectColor={setActiveColor} selectedColor={activeColor} />
        </div>
        <Toolbar
          className={styles.toolbar}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          applyEditsAcrossSprites={applyEditsAcrossSprites}
          setApplyEditsAcrossSprites={setApplyEditsAcrossSprites}
        />
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
            primaryButtonTitle={primaryButtons[activeTool].title}
            secondaryButtonTitle={secondaryButtons[activeTool].title}
            onButtonChanged={(isDown, buttonType) => {
              switch (buttonType) {
                case "primary":
                  setButtonPressed(1, isDown);
                  break;

                case "secondary":
                  setButtonPressed(2, isDown);
                  break;

                default:
                  return absurd(buttonType);
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
  absoluteCursorPixelPosition,
  cursorPixelPosition,
  activeSprite,
}: {
  activeColor: M.PixelContent;
  absoluteCursorPixelPosition: ReadonlyVec2;
  cursorPixelPosition: M.ReadonlyPixelVec2;
  activeSprite: M.Sprite;
}) {
  return useCustomCompareMemo(
    (): React.CSSProperties => {
      const [spriteWidth, spriteHeight] = M.Sprite.getSize(activeSprite);
      return {
        ...vec2.toLeftTop(absoluteCursorPixelPosition),
        backgroundColor: rgbaToCss(activeColor),
        width: `${100 / spriteWidth}%`,
        height: `${100 / spriteHeight}%`,
        visibility: M.Sprite.isPointInside(activeSprite, cursorPixelPosition)
          ? "visible"
          : "hidden",
      };
    },
    [
      activeColor,
      absoluteCursorPixelPosition,
      cursorPixelPosition,
      activeSprite,
    ],
    (
      [prevColor, prevAbsCursorPos, prevCursorPos, ...prevRest],
      [nextColor, nextAbsCursorPos, nextCursorPos, ...nextRest]
    ) =>
      arrayEquals(prevColor, nextColor) &&
      vec2.equals(prevAbsCursorPos, nextAbsCursorPos) &&
      vec2.equals(prevCursorPos, nextCursorPos) &&
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

function useOnCursorChangedCallback({
  beginPaint,
  paintPixels,
  pickColorAtLocation,
  translateSprite,
  activeTool,
}: {
  beginPaint: (artboardPos: readonly [number, number]) => void;
  paintPixels: (artboardPos: readonly [number, number]) => void;
  translateSprite: (offset: readonly [number, number]) => void;
  pickColorAtLocation: (loc: M.PixelLocation) => void;
  activeTool: M.Tool;
}): [
  (
    position: M.ReadonlyPixelVec2,
    buttonMask: number,
    previousPosition: M.ReadonlyPixelVec2,
    previousButtonMask: number
  ) => void
] {
  return [
    React.useCallback(
      (position, buttonMask, prevPosition, prevButtonMask) => {
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
          prevButtonMask === buttonMask &&
          arrayEquals(cursorPixelPosition, prevCursorPixelPosition)
        ) {
          // avoid causing updates when cursor has not meaningfully changed
          return;
        }

        if (!!(buttonMask & 0b1)) {
          if (!(prevButtonMask & 0b1)) {
            // button was just pressed
            beginPaint(position);
          }
          paintPixels(position);
        }
        if (!!(buttonMask & 0b10)) {
          switch (activeTool) {
            case "pen":
              pickColorAtLocation(cursorPixelPosition);
              break;
            case "eraser":
              pickColorAtLocation(cursorPixelPosition);
              break;
            case "bucket":
              const [cursorX, cursorY] = cursorPixelPosition;
              const offset = [
                cursorX - prevCursorX,
                cursorY - prevCursorY,
              ] as const;
              translateSprite(offset);
              break;
            default:
              return absurd(activeTool);
          }
        }
      },
      [
        activeTool,
        beginPaint,
        paintPixels,
        pickColorAtLocation,
        translateSprite,
      ]
    ),
  ];
}

function useCursor({
  initialCursorPosition,
  onCursorChanged,
  transform,
}: {
  initialCursorPosition: M.ReadonlyPixelVec2;
  onCursorChanged: (
    position: M.ReadonlyPixelVec2,
    buttonMask: number,
    previousPosition: M.ReadonlyPixelVec2,
    previousButtonMask: number
  ) => void;
  transform: ReadonlyMat2d;
}): {
  setCursorPosition: (nextPosition: M.PixelVec2) => void;
  moveCursorPosition: (delta: M.PixelVec2) => void;
  absoluteCursorPixelPosition: ReadonlyVec2;
  absoluteCursorPosition: ReadonlyVec2;
  cursorPixelPosition: M.ReadonlyPixelVec2;
  isButtonPressed: (queryMask: number) => boolean;
  setButtonPressed: (mask: number, isPressed: boolean) => void;
} {
  const [cursorPosition, setCursorPosition] =
    React.useState<M.ReadonlyPixelVec2>(initialCursorPosition);

  const [buttonMask, setButtonMask] = React.useState(0);

  const cursorPixelPosition = cursorPosition.map(Math.floor) as [
    number,
    number
  ];

  useOnChange(
    ([prevCursorPixelPosition, prevButtonMask]) => {
      onCursorChanged(
        cursorPixelPosition,
        buttonMask,
        prevCursorPixelPosition,
        prevButtonMask
      );
    },
    [cursorPixelPosition, buttonMask, onCursorChanged],
    ([prevPos, ...prevDeps], [nextPos, ...nextDeps]) =>
      arrayEquals(prevPos, nextPos) && arrayEquals(prevDeps, nextDeps)
  );

  const absoluteCursorPosition = useCustomCompareMemo(
    () =>
      vec2.transformMat2d(
        vec2.create(),
        cursorPosition,
        mat2d.invert(mat2d.create(), transform)
      ),
    [cursorPosition, transform],
    ([prevPos, prevTransform], [nextPos, nextTransform]) =>
      arrayEquals(prevPos, nextPos) &&
      mat2d.equals(prevTransform, nextTransform)
  );

  const absoluteCursorPixelPosition = useCustomCompareMemo(
    () =>
      vec2.transformMat2d(
        vec2.create(),
        cursorPixelPosition,
        mat2d.invert(mat2d.create(), transform)
      ),
    [cursorPixelPosition, transform],
    ([prevPos, prevTransform], [nextPos, nextTransform]) =>
      arrayEquals(prevPos, nextPos) &&
      mat2d.equals(prevTransform, nextTransform)
  );

  const moveCursorPosition = React.useCallback(
    (delta: M.PixelVec2) => {
      const [dx, dy] = delta;
      setCursorPosition(([prevX, prevY]) => [prevX + dx, prevY + dy]);
    },
    [setCursorPosition]
  );

  return {
    setCursorPosition,
    moveCursorPosition,
    absoluteCursorPixelPosition,
    absoluteCursorPosition,
    cursorPixelPosition,
    isButtonPressed: (buttonNumber: number) =>
      !!((1 << (buttonNumber - 1)) & buttonMask),
    setButtonPressed: (buttonNumber, isPressed: boolean) =>
      setButtonMask((prev) => {
        const mask = 1 << (buttonNumber - 1);
        if (isPressed) {
          return prev | mask;
        } else {
          return prev & ~mask;
        }
      }),
  };
}

function useHotkeyButtonPresses({
  isButtonPressed,
  setButtonPressed,
}: {
  isButtonPressed: (queryMask: number) => boolean;
  setButtonPressed: (mask: number, isPressed: boolean) => void;
}) {
  const globalKeyDownHandler = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "x" && !isButtonPressed(1)) {
        setButtonPressed(1, true);
      }
      if (event.key === "c" && !isButtonPressed(2)) {
        setButtonPressed(2, true);
      }
    },
    [isButtonPressed, setButtonPressed]
  );
  const globalKeyUpHandler = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "x") {
        setButtonPressed(1, false);
      }
      if (event.key === "c") {
        setButtonPressed(2, false);
      }
    },
    [setButtonPressed]
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
  transform,
  setButtonPressed,
  setCursorPosition,
  moveCursorPosition,
  interactionMode,
}: {
  transform: ReadonlyMat2d;
  setButtonPressed: (mask: number, isPressed: boolean) => void;
  setCursorPosition: (nextPosition: M.PixelVec2) => void;
  moveCursorPosition: (delta: M.PixelVec2) => void;
  interactionMode: "direct" | "cursor";
}): {
  bindHandlers: () => any;
  panGestureTargetRef: React.Ref<HTMLDivElement>;
  artboardContainerRef: React.Ref<HTMLDivElement>;
} {
  const bcrRef = React.useRef<DOMRect>(new DOMRect());

  const prevPositionRef = React.useRef<[number, number] | null>(null);

  // mutates input
  const convertClientPositionToArtboard = React.useCallback(
    (clientPos: Vec2): void => {
      vec2.sub(clientPos, clientPos, vec2.fromLeftTop(bcrRef.current));
      vec2.transformMat2d(clientPos, clientPos, transform);
    },
    [transform]
  );

  const locationFromClientPosition = React.useCallback(
    (clientLoc: ReadonlyVec2): M.PixelLocation => {
      const p = vec2.clone(clientLoc);
      convertClientPositionToArtboard(p);
      return vec2.toTuple(p);
    },
    [convertClientPositionToArtboard]
  );

  const artboardContainerRef = React.useRef<React.ElementRef<"div">>(null);
  const panGestureTargetRef = React.useRef<React.ElementRef<"div">>(null);

  const artboardLocationFromPanGestureLocation = React.useCallback(
    (gestureLocation: readonly [number, number]) => {
      const artboardContainer = artboardContainerRef.current;
      const panGestureTarget = panGestureTargetRef.current;
      if (artboardContainer == null || panGestureTarget == null) {
        return null;
      }
      const artboardOffsetFromGestureTarget = (() => {
        const out = vec2.fromLeftTop(artboardContainer.getBoundingClientRect());
        vec2.sub(
          out,
          out,
          vec2.fromLeftTop(panGestureTarget.getBoundingClientRect())
        );
        return out;
      })();
      const clientPositionInArtboard = vec2.sub(
        vec2.create(),
        gestureLocation,
        artboardOffsetFromGestureTarget
      );
      return locationFromClientPosition(clientPositionInArtboard);
    },
    [locationFromClientPosition]
  );

  const onArtboardPanStart = React.useCallback(
    (gestureState: PanEvent) => {
      bcrRef.current = gestureState.currentTarget.getBoundingClientRect();
      const pt = locationFromClientPosition(gestureState.xy);
      if (interactionMode === "direct") {
        const artboardLocation = artboardLocationFromPanGestureLocation(
          gestureState.xy
        );
        if (artboardLocation != null) {
          setCursorPosition(artboardLocation);
        }
        setButtonPressed(1, true);
      }
      prevPositionRef.current = pt;
    },
    [
      artboardLocationFromPanGestureLocation,
      locationFromClientPosition,
      interactionMode,
      setButtonPressed,
      setCursorPosition,
    ]
  );

  const onArtboardPan = React.useCallback(
    (gestureState: PanEvent) => {
      // kinda complicated: trying to avoid doing this transform on every
      // gesture - only doing it on direct interactions. that means that
      // `scaledPointInGestureTarget` and `previousPositionRef` will be scaled
      // to artboard units, but will be relative to the origin of the "artboard
      // stage".
      const scaledPointInGestureTarget = locationFromClientPosition(
        gestureState.xy
      );
      if (interactionMode === "direct") {
        const artboardLocation = artboardLocationFromPanGestureLocation(
          gestureState.xy
        );
        if (artboardLocation != null) {
          setCursorPosition(artboardLocation);
        }
      } else {
        const delta =
          prevPositionRef.current == null
            ? null
            : ([
                scaledPointInGestureTarget[0] - prevPositionRef.current[0],
                scaledPointInGestureTarget[1] - prevPositionRef.current[1],
              ] as [number, number]);
        if (delta != null) {
          moveCursorPosition(delta);
        }
      }
      prevPositionRef.current = scaledPointInGestureTarget;
    },
    [
      artboardLocationFromPanGestureLocation,
      locationFromClientPosition,
      moveCursorPosition,
      interactionMode,
      setCursorPosition,
    ]
  );

  const { bind } = usePan({
    onPanStart: onArtboardPanStart,
    onPanMove: onArtboardPan,
    onPanEnd: () => {
      if (interactionMode === "direct") {
        setButtonPressed(1, false);
      }
    },
    onPanOver: ({ xy }) => {
      if (interactionMode !== "direct") {
        return;
      }
      const artboardLocation = artboardLocationFromPanGestureLocation(xy);
      if (artboardLocation == null) {
        return;
      }
      setCursorPosition(artboardLocation);
    },
  });

  return { bindHandlers: bind, panGestureTargetRef, artboardContainerRef };
}

function useArtboardClientTransform({
  spriteSize,
  artboardClientSize,
}: {
  spriteSize: M.PixelVec2;
  artboardClientSize: ReadonlyVec2;
}): [ReadonlyMat2d] {
  return [
    useCustomCompareMemo(
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
    ),
  ];
}
