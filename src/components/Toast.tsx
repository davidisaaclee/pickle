import classNames from "classnames";
import styles from "./Toast.module.css";

interface Props {
  message: JSX.Element;
  hidden: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Toast({ message, hidden, className, style }: Props) {
  return (
    <div
      className={classNames(
        styles.container,
        hidden && styles.hidden,
        className
      )}
      style={style}
    >
      {message}
    </div>
  );
}
