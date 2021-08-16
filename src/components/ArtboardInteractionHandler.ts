import * as React from "react";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, Vec2, vec2 } from "../utility/gl-matrix";
import * as M from "../model";

interface Props {
  artboardClientTransform: ReadonlyMat2d;
  onDown?: (artboardPos: M.PixelLocation) => void;
  onUp?: (artboardPos: M.PixelLocation) => void;
  onDrag?: (artboardPos: M.PixelLocation, delta: M.PixelVec2 | null) => void;
  onMove?: (artboardPos: M.PixelLocation, delta: M.PixelVec2 | null) => void;
  children: (handlers: PointerHandlers) => JSX.Element;
}

export default function ArtboardInteractionHandler({
  onDown = () => {},
  onUp = () => {},
  onDrag = () => {},
  onMove = () => {},
  artboardClientTransform,
  children,
}: Props) {
  const bcrRef = React.useRef<DOMRect>(new DOMRect());

  const prevPositionRef = React.useRef<[number, number] | null>(null);

  // mutates input
  const convertClientPositionToArtboard = React.useCallback(
    (clientPos: Vec2): void => {
      vec2.sub(clientPos, clientPos, vec2.fromLeftTop(bcrRef.current));
      vec2.transformMat2d(clientPos, clientPos, artboardClientTransform);
    },
    [artboardClientTransform]
  );

  const locationFromPointerEvent = React.useCallback(
    (event: React.PointerEvent): M.PixelLocation => {
      const clientLoc = vec2.fromClientPosition(event);
      convertClientPositionToArtboard(clientLoc);
      return vec2.toTuple(clientLoc);
    },
    [convertClientPositionToArtboard]
  );

  const handlers = React.useMemo(
    (): PointerHandlers => ({
      onPointerDown(event) {
        bcrRef.current = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);

        const pt = locationFromPointerEvent(event);
        onDown(pt);
        prevPositionRef.current = pt;
      },
      onPointerUp(event) {
        event.currentTarget.releasePointerCapture(event.pointerId);

        const pt = locationFromPointerEvent(event);
        onUp(pt);
        prevPositionRef.current = pt;
      },
      onPointerMove(event) {
        const pt = locationFromPointerEvent(event);
        const delta =
          prevPositionRef.current == null
            ? null
            : ([
                pt[0] - prevPositionRef.current[0],
                pt[1] - prevPositionRef.current[1],
              ] as [number, number]);
        onMove(pt, delta);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          onDrag(pt, delta);
        }
        prevPositionRef.current = pt;
      },
    }),
    [locationFromPointerEvent, onMove, onDrag, onDown, onUp]
  );
  return children(handlers);
}
