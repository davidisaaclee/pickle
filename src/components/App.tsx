import * as React from "react";
import * as M from "../model";
import { vec2 } from "../utility/gl-matrix";
import Editor from "./Editor";
import { reducer, initialState, selectors, actions } from "./reducer";
import absurd from "../utility/absurd";

interface ConsoleOverride<T> {
  log: (...args: any[]) => T;
  error: (...args: any[]) => T;
  warn: (...args: any[]) => T;
}

export function useConsoleOverrides<T = void>(
  overrides: Partial<ConsoleOverride<T>>
): T[] {
  const [log, setLog] = React.useState<T[]>([]);

  React.useEffect(() => {
    ((c) => {
      for (const key in overrides) {
        c[key] = (...args: any) => {
          const ret = (overrides as any)[key](...args);
          setLog((prev) => [...prev, ret]);
        };
      }
    })(console as any);
  }, [overrides]);

  return log;
}

export default function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const dispatchRef = React.useRef(dispatch);
  dispatchRef.current = dispatch;

  const activeSprite = selectors.activeSprite(state);

  const paintPixels = React.useCallback(
    (artboardPos: readonly [number, number]) => {
      const loc = vec2.toTuple(vec2.floor(vec2.create(), artboardPos));

      if (state.activeTool === "pen" || state.activeTool === "eraser") {
        const content =
          state.activeTool === "pen"
            ? state.activeColor
            : ([0, 0, 0, 0] as M.PixelContent);
        dispatchRef.current(
          actions.paintPixels({
            locations: [loc],
            content,
          })
        );
      } else if (state.activeTool === "bucket") {
        dispatchRef.current(
          actions.paintBucket({
            location: loc,
            content: state.activeColor,
          })
        );
      } else {
        return absurd(state.activeTool);
      }
    },
    [state.activeColor, state.activeTool]
  );

  const beginPaint = React.useCallback(
    (artboardPos: readonly [number, number]) => {
      const loc = vec2.toTuple(vec2.floor(vec2.create(), artboardPos));
      if (state.activeTool === "bucket") {
        dispatchRef.current(actions.pushHistory());
        dispatchRef.current(
          actions.paintBucket({
            location: loc,
            content: state.activeColor,
          })
        );
      } else {
        dispatchRef.current(actions.pushHistory());
        paintPixels(loc);
      }
    },
    [paintPixels, state.activeTool, state.activeColor]
  );

  const _setActiveColor = React.useCallback(
    (color: M.PixelContent) => dispatch(actions.setActiveColor(color)),
    [dispatch]
  );

  const _setActiveTool = React.useCallback((tool: M.Tool) => {
    dispatchRef.current(actions.setActiveTool(tool));
  }, []);

  // const log = useConsoleOverrides({
  //   log: (...msgs) => {
  //     return "LOG: " + msgs.join(" ");
  //   },
  //   error: (...msgs) => {
  //     return "ERROR: " + msgs.join(" ");
  //   },
  //   warn: (...msgs) => {
  //     return "WARN: " + msgs.join(" ");
  //   },
  // });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Editor
        {...{
          animation: selectors.activeAnimation(state),
          setActiveTool: _setActiveTool,
          activeTool: state.activeTool,
          activeColor: selectors.activeColor(state),
          setActiveColor: _setActiveColor,
          activeSprite,
          setPlayhead: (index) => dispatch(actions.movePlayhead(index)),
          beginPaint,
          paintPixels,
          translateSprite: (offset) =>
            dispatchRef.current(actions.translateSprite({ offset })),
          undo: () => dispatch(actions.undo()),
          redo: () => dispatch(actions.redo()),
          currentFrameIndex: selectors.currentFrameIndex(state),
          addBlankAnimationFrame: () => {
            dispatch(actions.pushHistory());
            dispatch(actions.addBlankAnimationFrame());
          },
          duplicateCurrentAnimationFrame: () => {
            dispatch(actions.pushHistory());
            dispatch(actions.duplicateCurrentAnimationFrame());
          },
          cutFrame: () => {
            dispatchRef.current(actions.copyFrame());
            dispatchRef.current(actions.pushHistory());
            dispatchRef.current(actions.deleteActiveSprite());
          },
          copyFrame: () => {
            dispatchRef.current(actions.copyFrame());
          },
          pasteFrame: async () => {
            dispatchRef.current(actions.pushHistory());
            dispatchRef.current(actions.pasteFrame());
          },
          pickColorAtLocation: (loc) =>
            dispatchRef.current(actions.pickColorAtLocation(loc)),
          applyEditsAcrossSprites: selectors.applyEditsAcrossSprites(state),
          setApplyEditsAcrossSprites: (v) =>
            dispatch(actions.setApplyEditsAcrossSprites(v)),
        }}
      />
      {/*
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          overflowY: "scroll",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
        }}
      >
        {log.map((l) => (
          <code style={{ display: "block" }}>{l}</code>
        ))}
      </div>
        */}
    </div>
  );
}
