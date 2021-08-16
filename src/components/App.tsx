import * as React from "react";
import * as M from "../model";
import { vec2 } from "../utility/gl-matrix";
import Editor from "./Editor";
import { reducer, initialState, selectors, actions } from "./reducer";
import arrayEquals from "../utility/arrayEquals";

export default function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const dispatchRef = React.useRef(dispatch);
  dispatchRef.current = dispatch;

  const activeSprite = selectors.activeSprite(state);

  const spriteSize = M.Sprite.getSize(activeSprite);

  const paintPixels = React.useCallback(
    (artboardPos: readonly [number, number]) => {
      if (
        vec2.x(artboardPos) < 0 ||
        vec2.x(artboardPos) >= vec2.x(spriteSize)
      ) {
        return;
      }
      if (
        vec2.y(artboardPos) < 0 ||
        vec2.y(artboardPos) >= vec2.y(spriteSize)
      ) {
        return;
      }
      const color =
        state.activeTool === "pen"
          ? state.activeColor
          : ([0, 0, 0, 0] as M.PixelContent);
      const loc = vec2.toTuple(vec2.floor(vec2.create(), artboardPos));
      if (arrayEquals(M.Sprite.getPixel(activeSprite, loc), color)) {
        return;
      }
      const nextSprite = ((prev) => {
        const out = M.Sprite.shallowClone(prev);
        M.Sprite.setPixelsRGBA(out, [loc], color);
        M.Sprite.updateEditHash(out);
        return out;
      })(activeSprite);

      dispatch(actions.updateActiveSprite(nextSprite));
    },
    [state, spriteSize, activeSprite, dispatch]
  );

  const beginPaint = React.useCallback(
    (artboardPos: readonly [number, number]) => {
      dispatch(actions.pushHistory());
      paintPixels(vec2.toTuple(artboardPos));
    },
    [paintPixels, dispatch]
  );

  const _setActiveColor = React.useCallback(
    (color: M.PixelContent) => dispatch(actions.setActiveColor(color)),
    [dispatch]
  );

  const _setActiveTool = React.useCallback((tool: M.Tool) => {
    dispatchRef.current(actions.setActiveTool(tool));
  }, []);

  return (
    <Editor
      {...{
        setActiveTool: _setActiveTool,
        activeTool: state.activeTool,
        setActiveColor: _setActiveColor,
        activeSprite,
        beginPaint,
        paintPixels,
        undo: () => dispatch(actions.undo()),
        redo: () => dispatch(actions.redo()),
      }}
    />
  );
}
