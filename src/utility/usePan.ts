import * as React from "react";

type Handlers<T> = Partial<
  Pick<
    React.DOMAttributes<T>,
    "onPointerDown" | "onPointerMove" | "onPointerUp"
  >
>;
type BindHandlers<T> = () => Handlers<T>;

type CombineFunctionRecords = <K extends string, A>(
  a: Partial<Record<K, (a0: A) => void>>,
  b: Partial<Record<K, (a0: A) => void>>
) => Partial<Record<K, (a0: A) => void>>;
const combineFunctionRecords: CombineFunctionRecords = (a: any, b: any) => {
  const out: Partial<Record<any, any>> = {};
  const allKeys = new Set(Object.keys(a));
  Object.keys(b).forEach((k) => allKeys.add(k));
  allKeys.forEach((key: any) => {
    out[key] = (...args: any[]) => {
      if (a[key] != null) {
        a[key](...args);
      }
      if (b[key] != null) {
        b[key](...args);
      }
    };
  });
  return out;
};

export function combineBindHandlers<T>(
  bindHandlersList: BindHandlers<T>[]
): BindHandlers<T> {
  return () => {
    let out: Handlers<T> = {};

    for (const bh of bindHandlersList) {
      out = combineFunctionRecords(bh(), out);
    }

    return out;
  };
}

export interface PanEvent<E = Element> {
  currentTarget: E;
  xy: readonly [number, number];
}

export default function usePan<T extends React.ComponentType & Element>({
  onPanStart = () => {},
  onPanMove = () => {},
  onPanEnd = () => {},
  onPanOver = () => {},
  shouldRespondToEvent = () => true,
}: Partial<{
  onPanStart: (event: PanEvent<T>) => void;
  onPanMove: (event: PanEvent<T>) => void;
  onPanEnd: (event: PanEvent<T>) => void;
  // triggered when a cursor-based device (like mouse) is hovering over the
  // element, whether pressed or not
  onPanOver: (event: PanEvent<T>) => void;

  shouldRespondToEvent: (event: React.PointerEvent<T>) => boolean;
}>): { bind: BindHandlers<T> } {
  return {
    bind() {
      return {
        onPointerDown(event: React.PointerEvent<T>) {
          if (!shouldRespondToEvent(event)) {
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          onPanStart({
            xy: [event.clientX, event.clientY],
            currentTarget: event.currentTarget,
          });
        },
        onPointerMove(event: React.PointerEvent<T>) {
          if (!shouldRespondToEvent(event)) {
            return;
          }
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
          if (!shouldRespondToEvent(event)) {
            return;
          }
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
