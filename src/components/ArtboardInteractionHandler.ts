import * as React from "react";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, Vec2, vec2 } from "../utility/gl-matrix";
import * as M from "../model";

interface Props {
  artboardClientTransform: ReadonlyMat2d;
  onDown?: (artboardPos: M.PixelLocation) => void;
  onUp?: (artboardPos: M.PixelLocation) => void;
  onDrag?: (artboardPos: M.PixelLocation) => void;
  onMove?: (artboardPos: M.PixelLocation) => void;
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

  // mutates input
  const convertClientPositionToArtboard = React.useCallback(
    (clientPos: Vec2): void => {
      vec2.sub(clientPos, clientPos, vec2.fromLeftTop(bcrRef.current));
      vec2.transformMat2d(clientPos, clientPos, artboardClientTransform);
    },
    [artboardClientTransform]
  );

  const handlers = React.useMemo(
    (): PointerHandlers => ({
      onPointerDown(event) {
        bcrRef.current = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);

        const clientLoc = vec2.fromClientPosition(event);
        convertClientPositionToArtboard(clientLoc);
        onDown(vec2.toTuple(clientLoc));
      },
      onPointerUp(event) {
        event.currentTarget.releasePointerCapture(event.pointerId);

        const clientLoc = vec2.fromClientPosition(event);
        convertClientPositionToArtboard(clientLoc);
        onUp(vec2.toTuple(clientLoc));
      },
      onPointerMove(event) {
        const clientLoc = vec2.fromClientPosition(event);
        convertClientPositionToArtboard(clientLoc);
        const pt = vec2.toTuple(clientLoc);
        onMove(pt);

        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }
        onDrag(pt);
      },
    }),
    [convertClientPositionToArtboard, onMove, onDrag, onDown, onUp]
  );
  return children(handlers);
}
