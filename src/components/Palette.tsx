import * as React from "react";

interface Props {
  style?: React.CSSProperties;
}

export default function Palette({ style }: Props) {
  return <div style={style}>Palette</div>;
}
