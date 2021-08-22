import * as React from "react";
import * as M from "../model";
import {
  useCustomCompareCallback,
  useCustomCompareMemo,
} from "use-custom-compare";
import { vec2 } from "../utility/gl-matrix";
import Editor from "./Editor";
import { reducer, initialState, selectors, actions } from "./reducer";
import { Comparator } from "../utility/Comparator";

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

  const replacePixels = React.useCallback(
    (content: M.PixelContent) => (locations: M.ReadonlyPixelVec2[]) => {
      dispatchRef.current(
        actions.paintPixels({
          locations: locations.map((loc) =>
            vec2.toTuple(vec2.floor(vec2.create(), loc))
          ),
          content,
        })
      );
    },
    []
  );

  const paintPixels = useCustomCompareMemo(
    () => replacePixels(state.activeColor),
    [state.activeColor, replacePixels],
    Comparator.flatten([Comparator.arrayEquals, Comparator.equals])
  );
  const erasePixels = React.useMemo(
    () => replacePixels([0, 0, 0, 0]),
    [replacePixels]
  );

  const fillAreaStartingAt = useCustomCompareCallback(
    (location: M.ReadonlyPixelVec2) => {
      dispatchRef.current(
        actions.paintBucket({
          location,
          content: state.activeColor,
        })
      );
    },
    [state.activeColor],
    Comparator.flatten([Comparator.arrayEquals])
  );

  const willPerformUndoableEdit = React.useCallback(() => {
    dispatchRef.current(actions.pushHistory());
  }, []);

  const _setActiveColor = React.useCallback(
    (color: M.PixelContent) => dispatch(actions.setActiveColor(color)),
    [dispatch]
  );

  const _setActiveTool = React.useCallback((tool: M.Tool | null) => {
    dispatchRef.current(actions.setActiveTool(tool));
  }, []);

  const translateSprite = React.useCallback(
    (offset: M.ReadonlyPixelVec2) =>
      dispatchRef.current(actions.translateSprite({ offset })),
    []
  );

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
          willPerformUndoableEdit,
          paintPixels,
          erasePixels,
          fillAreaStartingAt,
          translateSprite,
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
