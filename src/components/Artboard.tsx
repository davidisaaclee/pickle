import * as React from 'react';

interface Props {
  style?: React.StyleHTMLAttributes<'div'>;
}

export default function Artboard({
  style
}: Props) {
  return <div style={style}>Artboard</div>;
}

