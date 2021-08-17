import { compact } from "lodash";
import * as React from "react";
import classNames from "classnames";
import useDimensions from "react-cool-dimensions";
import Artboard from "./Artboard";
import * as M from "../model";
import Button from "./Button";
import styles from "./Timeline.module.css";

interface Props {
  sprites: M.Sprite[];
  onSelectFrame: (index: number) => void;
  selectedFrameIndex: number;
  onRequestAddFrame?: (options: { duplicateSelected: boolean }) => void;
  className?: string;
  style?: React.CSSProperties;
}

const emptySprite = M.Sprite.create();
const SCROLL_SELECTION_LEADING_MARGIN = 0;

export default function Timeline({
  sprites,
  onSelectFrame,
  selectedFrameIndex,
  onRequestAddFrame = () => {},
  className,
  style,
}: Props) {
  const [framePreviewHeight, setFramePreviewHeight] = React.useState(50);
  const { observe } = useDimensions({
    onResize: ({ height }) => {
      setFramePreviewHeight(height);
    },
  });

  const frameRefs = React.useRef<Array<React.ElementRef<typeof Button> | null>>(
    []
  );
  React.useEffect(() => {
    if (frameRefs.current.length !== sprites.length) {
      frameRefs.current = new Array(sprites.length);
    }
  }, [sprites.length]);

  const getActiveSpriteByScroll = React.useCallback(
    (scrollContainer: Element): number | null => {
      const containerCenterX =
        scrollContainer.scrollLeft + scrollContainer.clientWidth * 0.5;

      const nextSelectionMatches = compact(
        frameRefs.current.map((f, idx) =>
          f == null ? null : ([f, idx] as const)
        )
      )
        // calculate horizontal bounds for each item, relative to scroll container
        .map(([f, idx]) => {
          const bounds = {
            left: f.offsetLeft,
            right: f.offsetLeft + f.offsetWidth,
          };
          return [idx, f, bounds] as const;
        })
        // keep only those elements that are within the scroll container
        .filter(
          ([_idx, _frame, bounds]) =>
            bounds.left >
              scrollContainer.scrollLeft + SCROLL_SELECTION_LEADING_MARGIN &&
            bounds.right <
              scrollContainer.scrollLeft + scrollContainer.scrollWidth
        )
        // sort by distance from containerCenterX
        .sort(([_idxA, _frameA, boundsA], [_idxB, _frameB, boundsB]) => {
          return (
            Math.abs((boundsA.left + boundsA.right) * 0.5 - containerCenterX) -
            Math.abs((boundsB.left + boundsB.right) * 0.5 - containerCenterX)
          );
        });
      // sort by x position (leftmost first)
      // .sort(
      //   ([_idxA, _frameA, boundsA], [_idxB, _frameB, boundsB]) =>
      //     boundsA.left - boundsB.left
      // );

      const match = nextSelectionMatches[0];
      if (match == null) {
        return null;
      }
      const [matchIndex] = match;
      return matchIndex;
    },
    []
  );

  return (
    <div className={classNames(styles.container, className)} style={style}>
      <div
        className={styles.scrollContainer}
        style={style}
        onScroll={(event) => {
          const matchIndex = getActiveSpriteByScroll(event.currentTarget);
          if (matchIndex == null || matchIndex === selectedFrameIndex) {
            return;
          }
          onSelectFrame(matchIndex);
        }}
      >
        <div ref={observe} className={styles.frameContainer}>
          {sprites.map((sprite, index) => (
            <Button
              ref={(elm) => {
                frameRefs.current[index] = elm;
              }}
              className={classNames(styles.frameButton)}
              onClick={() => onSelectFrame(index)}
            >
              <Artboard
                className={classNames(
                  styles.artboardPreview,
                  index === selectedFrameIndex && styles.selectedArtboardPreview
                )}
                style={{
                  width: framePreviewHeight,
                  height: framePreviewHeight,
                }}
                sprite={sprite}
              />
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.controlsContainer}>
        <Button
          className={classNames(styles.addFrameButton)}
          onClick={() => onRequestAddFrame({ duplicateSelected: true })}
        >
          <label className={styles.label}>duplicate frame</label>
        </Button>
        <Button
          className={classNames(styles.addFrameButton)}
          onClick={() => onRequestAddFrame({ duplicateSelected: false })}
        >
          <label className={styles.label}>add new frame</label>
        </Button>
        {/*
        <Button
          className={classNames(styles.frameButton, styles.addFrameButton)}
          onClick={() => onRequestAddFrame({ duplicateSelected: true })}
        >
          <Artboard
            className={styles.artboardPreview}
            style={{ width: framePreviewHeight, height: framePreviewHeight }}
            sprite={sprites[selectedFrameIndex]}
          />
          <label className={styles.label}>duplicate selected frame</label>
        </Button>
        <Button
          className={classNames(styles.frameButton, styles.addFrameButton)}
          onClick={() => onRequestAddFrame({ duplicateSelected: false })}
        >
          <Artboard
            className={styles.artboardPreview}
            style={{ width: framePreviewHeight, height: framePreviewHeight }}
            sprite={emptySprite}
          />
          <label className={styles.label}>add empty frame</label>
        </Button>
          */}
      </div>
    </div>
  );
}
