import * as React from "react";
import { PointerHandlers } from "../utility/PointerHandlers";
import { ReadonlyMat2d, ReadonlyVec2, Vec2, vec2 } from "../utility/gl-matrix";

interface Props {
  artboardClientTransform: ReadonlyMat2d;
  onDown?: (artboardPos: ReadonlyVec2) => void;
  onUp?: (artboardPos: ReadonlyVec2) => void;
  onMove?: (artboardPos: ReadonlyVec2) => void;
  children: (handlers: PointerHandlers) => JSX.Element;
}

export default function ArtboardInteractionHandler({
  onDown = () => {},
  onUp = () => {},
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
        onDown(clientLoc);
      },
      onPointerUp(event) {
        event.currentTarget.releasePointerCapture(event.pointerId);

        const clientLoc = vec2.fromClientPosition(event);
        convertClientPositionToArtboard(clientLoc);
        onUp(clientLoc);
      },
      onPointerMove(event) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }
        const clientLoc = vec2.fromClientPosition(event);
        convertClientPositionToArtboard(clientLoc);
        onMove(clientLoc);
      },
    }),
    [convertClientPositionToArtboard, onMove, onDown, onUp]
  );
  return children(handlers);
}
