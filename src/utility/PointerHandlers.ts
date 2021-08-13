import * as React from "react";

export interface PointerHandlers<T = Element> {
  onPointerDown?: React.PointerEventHandler<T>;
  onPointerUp?: React.PointerEventHandler<T>;
  onPointerMove?: React.PointerEventHandler<T>;
}
