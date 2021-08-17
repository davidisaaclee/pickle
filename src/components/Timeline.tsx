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

  return (
    <div
      className={classNames(styles.scrollContainer, className)}
      style={style}
    >
      <div ref={observe} className={styles.container}>
        {sprites.map((sprite, index) => (
          <Button
            className={classNames(styles.frameButton)}
            onClick={() => onSelectFrame(index)}
          >
            <Artboard
              className={classNames(
                styles.artboardPreview,
                index === selectedFrameIndex && styles.selectedArtboardPreview
              )}
              style={{ width: framePreviewHeight, height: framePreviewHeight }}
              sprite={sprite}
            />
          </Button>
        ))}
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
      </div>
    </div>
  );
}
