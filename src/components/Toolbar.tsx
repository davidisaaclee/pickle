import * as React from 'react';
import * as M from '../model';

interface Props {
  activeTool: M.Tool;
  onSelectTool: (tool: M.Tool) => void;
  style?: React.StyleHTMLAttributes<'div'>;
}

export default function Toolbar({
  style
}: Props) {
  return <div style={style}>Toolbar</div>;
}
