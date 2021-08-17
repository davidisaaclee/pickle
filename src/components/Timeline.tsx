import classNames from "classnames";
import Artboard from "./Artboard";
import * as M from "../model";
import Button from "./Button";
import { mat2d } from "../utility/gl-matrix";
import styles from "./Timeline.module.css";

interface Props {
  sprites: M.Sprite[];
  onSelectFrame: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

const identityMatrix = mat2d.create();

export default function Timeline({
  sprites,
  onSelectFrame,
  className,
  style,
}: Props) {
  return (
    <div className={classNames(styles.container, className)} style={style}>
      {sprites.map((sprite, index) => (
        <Button
          className={styles.frameButton}
          onClick={() => onSelectFrame(index)}
        >
          <Artboard
            style={{
              height: "100%",
            }}
            sprite={sprite}
            transform={identityMatrix}
          />
        </Button>
      ))}
    </div>
  );
}
