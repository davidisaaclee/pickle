import classNames from "classnames";
import styles from "./Button.module.css";

export default function Button({
  className,
  ...passedProps
}: React.ComponentProps<"button">) {
  return (
    <button
      className={classNames(styles.resetButton, className)}
      {...passedProps}
    />
  );
}
