import { v4 as uuid } from "uuid";
import * as React from "react";
import { createReducer, createAction } from "@reduxjs/toolkit";
import classNames from "classnames";
import Artboard from "./components/Artboard";
import ArtboardInteractionHandler from "./components/ArtboardInteractionHandler";
import Toolbar from "./components/Toolbar";
import * as M from "./model";
import styles from "./App.module.css";
import { ReadonlyVec2, mat2d, vec2 } from "./utility/gl-matrix";
import absurd from "./utility/absurd";

const artboardClientSize = vec2.fromValues(500, 500);

const changeTool = createAction<{ tool: M.Tool }>("changeTool");
const applyTool =
  createAction<{ locations: ReadonlyVec2[]; phase: "down" | "move" | "up" }>(
    "applyTool"
  );
// const undo = createAction("undo");
// const redo = createAction("redo");

type Command = ReturnType<typeof changeTool> | ReturnType<typeof applyTool>;

const executeCommand = createAction<Command>("executeCommand");

interface State {
  history: Command[];
}

const initialState: State = {
  history: [],
};

const reducer = createReducer(initialState, (builder) =>
  builder
    .addCase(changeTool, (state, action) => {
      state.activeTool = action.payload.tool;
    })
    .addCase(applyTool, (state, action) => {
      const locations = action.payload.locations.map(vec2.clone);

      const instructions = ((tool) => {
        switch (tool) {
          case "pen":
            return [
              {
                type: "write-pixels",
                locations,
                paletteRef: 1,
              },
            ];

          case "eraser":
            return [
              {
                type: "clear-pixels",
                locations,
              },
            ];

          default:
            return absurd(tool);
        }
      })(state.activeTool);

      state.activeSprite.commits.push({
        hash: uuid(),
        instructions,
      });
    })
);

const selectors = {
  activeSprite(state: State): M.Sprite {
    return state.activeSprite;
  },

  activeTool(state: State): M.Tool {
    return state.activeTool;
  },
};

function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  React.useEffect(() => {
    console.log("State changed:", state);
  }, [state]);

  const activeSprite = selectors.activeSprite(state);
  const activeTool = selectors.activeTool(state);

  /** if `v` is a client position, the following will give the artboard
   * coordinates:
   *     vec2.transformMat2d(v, v, artboardClientTransform)
   */
  const artboardClientTransform = React.useMemo(() => {
    const out = mat2d.create();
    mat2d.fromScaling(
      out,
      vec2.div(vec2.create(), activeSprite.size, artboardClientSize)
    );
    return out;
  }, [activeSprite.size]);

  return (
    <div className={classNames(styles.container)}>
      <Toolbar
        className={styles.toolbar}
        activeTool={activeTool}
        onSelectTool={(tool) => {
          dispatch(changeTool({ tool }));
        }}
      />
      <ArtboardInteractionHandler
        onDown={(artboardPos) => {
          dispatch(
            applyTool({
              phase: "down",
              locations: [artboardPos],
            })
          );
        }}
        onMove={(artboardPos) => {
          dispatch(
            applyTool({
              phase: "move",
              locations: [artboardPos],
            })
          );
        }}
        artboardClientTransform={artboardClientTransform}
      >
        {(handlers) => (
          <Artboard
            {...handlers}
            className={classNames(styles.artboard)}
            style={{}}
            sprite={activeSprite}
            transform={artboardClientTransform}
          />
        )}
      </ArtboardInteractionHandler>
    </div>
  );
}

export default App;
