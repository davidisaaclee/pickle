import * as React from "react";

interface Props {
  style?: React.StyleHTMLAttributes<"div">;
}

export default function Palette({ style }: Props) {
  return <div style={style}>Palette</div>;
}
