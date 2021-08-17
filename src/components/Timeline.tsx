import classNames from "classnames";
import Artboard from "./Artboard";
import * as M from "../model";
import Button from "./Button";
import { mat2d } from "../utility/gl-matrix";
import styles from "./Timeline.module.css";

interface Props {
  sprites: M.Sprite[];
  onSelectFrame: (index: number) => void;
  selectedFrameIndex: number;
  className?: string;
  style?: React.CSSProperties;
}

const identityMatrix = mat2d.create();

export default function Timeline({
  sprites,
  onSelectFrame,
  selectedFrameIndex,
  className,
  style,
}: Props) {
  return (
    <div
      className={classNames(styles.scrollContainer, className)}
      style={style}
    >
      <div className={styles.container}>
        {sprites.map((sprite, index) => (
          <Button
            className={classNames(
              styles.frameButton,
              index === selectedFrameIndex && styles.selectedFrameButton
            )}
            onClick={() => onSelectFrame(index)}
          >
            <Artboard
              className={styles.artboardPreview}
              sprite={sprite}
              transform={identityMatrix}
            />
          </Button>
        ))}
      </div>
    </div>
  );
}
