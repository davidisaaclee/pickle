import * as React from "react";
import classNames from "classnames";
import styles from "./Button.module.css";

export default React.forwardRef<
  React.ElementRef<"button">,
  React.ComponentProps<"button">
>(function Button({ className, ...passedProps }, ref) {
  return (
    <button
      ref={ref}
      className={classNames(styles.resetButton, className)}
      {...passedProps}
    />
  );
});
