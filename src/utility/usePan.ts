import * as React from "react";

export interface PanEvent<E = Element> {
  currentTarget: E;
  xy: readonly [number, number];
}

export default function usePan<T extends React.ComponentType & Element>({
  onPanStart = () => {},
  onPanMove = () => {},
  onPanEnd = () => {},
  onPanOver = () => {},
}: Partial<{
  onPanStart: (event: PanEvent<T>) => void;
  onPanMove: (event: PanEvent<T>) => void;
  onPanEnd: (event: PanEvent<T>) => void;

  // triggered when a cursor-based device (like mouse) is hovering over the
  // element, whether pressed or not
  onPanOver: (event: PanEvent<T>) => void;
}>): { bind: () => React.ComponentProps<T> & any } {
  return {
    bind() {
      return {
        onPointerDown(event: React.PointerEvent<T>) {
          event.currentTarget.setPointerCapture(event.pointerId);
          onPanStart({
            xy: [event.clientX, event.clientY],
            currentTarget: event.currentTarget,
          });
        },
        onPointerMove(event: React.PointerEvent<T>) {
          const panEvent: PanEvent<T> = {
            xy: [event.clientX, event.clientY],
            currentTarget: event.currentTarget,
          };

          onPanOver(panEvent);

          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          onPanMove(panEvent);
        },
        onPointerUp(event: React.PointerEvent<T>) {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          event.currentTarget.releasePointerCapture(event.pointerId);
          onPanEnd({
            xy: [event.clientX, event.clientY],
            currentTarget: event.currentTarget,
          });
        },
      };
    },
  };
}
