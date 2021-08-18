import * as React from "react";
import classNames from "classnames";
import {
  useCustomCompareMemo,
  useCustomCompareEffect,
} from "use-custom-compare";
import Artboard from "../components/Artboard";
import Toolbar from "../components/Toolbar";
import Menubar from "../components/Menubar";
import Palette from "../components/Palette";
import Timeline from "../components/Timeline";
import CursorModeButtons from "../components/CursorModeButtons";
import * as M from "../model";
import styles from "./Editor.module.css";
import { ReadonlyVec2, Vec2, mat2d, vec2 } from "../utility/gl-matrix";
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

  beginPaint: (artboardPos: readonly [number, number]) => void;
  paintPixels: (artboardPos: readonly [number, number]) => void;
  translateSprite: (offset: readonly [number, number]) => void;

  undo: () => void;
  redo: () => void;
  addBlankAnimationFrame: () => void;
  duplicateCurrentAnimationFrame: () => void;
  pickColorAtLocation: (loc: M.PixelLocation) => void;
  setPlayhead: (index: number) => void;
  currentFrameIndex: number;
  cutFrame: () => void;
  copyFrame: () => void;
  pasteFrame: () => void;
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
}: Props) {
  const [interactionMode, setInteractionMode] = React.useState<
    "cursor" | "direct"
  >("cursor");
  const [isPrimaryButtonPressed, setPrimaryButtonPressed] =
    React.useState(false);
  const [isSecondaryButtonPressed, setSecondaryButtonPressed] =
    React.useState(false);

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
    downloadURI(
      dataUriForSpriteSheet(
        animation.sprites,
        document.createElement("canvas")
      ),
      "da-update"
    );
  }, [animation.sprites]);

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
      if (isPrimaryButtonPressed) {
        paintPixels(cursorPixelPosition);
      }
    },
    [cursorPixelPosition, isPrimaryButtonPressed, paintPixels],
    ([prevPos, ...prevDeps], [nextPos, ...nextDeps]) =>
      arrayEquals(prevPos, nextPos) && arrayEquals(prevDeps, nextDeps)
  );
  useOnChange(
    ([[prevCursorX, prevCursorY]]) => {
      if (isSecondaryButtonPressed) {
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
    [cursorPixelPosition, isSecondaryButtonPressed],
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
    []
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
        setPrimaryButtonPressed(true);
      }
      prevPositionRef.current = pt;
    },
    [
      locationFromClientPosition,
      beginPaint,
      interactionMode,
      setPrimaryButtonPressed,
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
        moveCursor(scaledPointInGestureTarget, delta);
      }
      prevPositionRef.current = scaledPointInGestureTarget;
    },
    [locationFromClientPosition, paintPixels, moveCursor, interactionMode]
  );

  const { bind: bindDrag } = usePan({
    onPanStart: onArtboardPanStart,
    onPanMove: onArtboardPan,
    onPanEnd: () => {
      if (interactionMode === "direct") {
        setPrimaryButtonPressed(false);
      }
    },
  });

  const globalKeyDownHandler = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "x" && !isPrimaryButtonPressed) {
        setPrimaryButtonPressed(true);
      }
      if (event.key === "c" && !isSecondaryButtonPressed) {
        setSecondaryButtonPressed(true);
      }
    },
    [setPrimaryButtonPressed, isPrimaryButtonPressed]
  );
  const globalKeyUpHandler = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "x") {
        setPrimaryButtonPressed(false);
      }
      if (event.key === "c") {
        setSecondaryButtonPressed(false);
      }
    },
    [setPrimaryButtonPressed]
  );

  React.useEffect(() => {
    window.addEventListener("keydown", globalKeyDownHandler);
    window.addEventListener("keyup", globalKeyUpHandler);

    return () => {
      window.removeEventListener("keydown", globalKeyDownHandler);
      window.removeEventListener("keyup", globalKeyUpHandler);
    };
  }, [globalKeyDownHandler, globalKeyUpHandler]);

  return (
    <div className={classNames(styles.container)}>
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
      <div className={styles.toolGroup}>
        <div
          className={styles.colorSwatch}
          style={{ backgroundColor: rgbaToCss(activeColor) }}
        />
        <Palette onSelectColor={setActiveColor} selectedColor={activeColor} />
        <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />
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
      <Timeline
        className={styles.timeline}
        sprites={animation.sprites}
        selectedFrameIndex={currentFrameIndex}
        onSelectFrame={(index) => {
          setPlayhead(index);
        }}
        onRequestAddFrame={({ duplicateSelected }) => {
          if (duplicateSelected) {
            duplicateCurrentAnimationFrame();
          } else {
            addBlankAnimationFrame();
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
                setPrimaryButtonPressed(isDown);
                break;

              case "secondary":
                setSecondaryButtonPressed(isDown);
                break;

              default:
                return absurd(buttonType);
            }
          }}
        />
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
