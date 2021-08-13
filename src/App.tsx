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

const toMutableTuple = (v2: ReadonlyVec2): [number, number] => [
  vec2.x(v2),
  vec2.y(v2),
];

const applyTool = createAction(
  "applyTool",
  (params: {
    tool: M.Tool;
    locations: [number, number][];
    phase: "down" | "move" | "up";
  }) => ({
    payload: {
      ...params,
      locations: params.locations.map((l) => vec2.floor(l, l)),
    },
  })
);
const undo = createAction("undo");
const redo = createAction("redo");

type Command = ReturnType<typeof applyTool>;

const executeCommand = createAction<{ command: Command }>("executeCommand");

interface State {
  history: { hash: string; command: Command }[];

  // number of indices from end of `history` for current displayed state
  // 0 means the last element in `history` is the displayed state
  cursor: number;
}

const initialState: State = {
  history: [],
  cursor: 0,
};

const reducer = createReducer(initialState, (builder) =>
  builder
    .addCase(executeCommand, (state, action) => {
      if (state.cursor > 0) {
        state.history.splice(state.history.length - state.cursor, state.cursor);
        state.cursor = 0;
      }
      state.history.push({
        hash: uuid(),
        command: action.payload.command,
      });
    })
    .addCase("undo", (state) => {
      state.cursor += 1;
      state.cursor = Math.min(state.history.length - 1, state.cursor);
    })
    .addCase("redo", (state) => {
      state.cursor -= 1;
      state.cursor = Math.max(0, state.cursor);
    })
);

let __instr_count = 0;

const spriteReducer = createReducer(M.Sprite.create(), (builder) =>
  builder.addCase(applyTool, (sprite, action) => {
    switch (action.payload.tool) {
      case "pen":
        __instr_count++;
        action.payload.locations.forEach((loc) =>
          M.Sprite.setPixelRGBA(sprite, loc, [255, 0, 0, 255])
        );
        return;
      case "eraser":
        __instr_count++;
        action.payload.locations.forEach((loc) =>
          M.Sprite.setPixelRGBA(sprite, loc, [0, 0, 0, 0])
        );
        return;
      default:
        return absurd(action.payload.tool);
    }
  })
);

const selectors = {
  activeSprite(state: State): M.Sprite {
    __instr_count = 0;
    const out = state.history
      .slice(0, state.history.length - state.cursor)
      .map(({ command }) => command)
      .reduce(spriteReducer, M.Sprite.create());
    console.log("did calc", __instr_count);
    return out;
  },
};

function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const [activeTool, setActiveTool] = React.useState<M.Tool>("pen");

  React.useEffect(() => {
    console.log("State changed:", state);
  }, [state]);

  const activeSprite = selectors.activeSprite(state);

  /** if `v` is a client position, the following will give the artboard
   * coordinates:
   *     vec2.transformMat2d(v, v, artboardClientTransform) */
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
        onSelectTool={setActiveTool}
        onSelectUndo={() => dispatch(undo())}
        onSelectRedo={() => dispatch(redo())}
      />
      <ArtboardInteractionHandler
        onDown={(artboardPos) => {
          dispatch(
            executeCommand({
              command: applyTool({
                phase: "down",
                locations: [artboardPos].map(toMutableTuple),
                tool: activeTool,
              }),
            })
          );
        }}
        onMove={(artboardPos) => {
          dispatch(
            executeCommand({
              command: applyTool({
                phase: "move",
                locations: [artboardPos].map(toMutableTuple),
                tool: activeTool,
              }),
            })
          );
        }}
        onUp={(artboardPos) => {
          dispatch(
            executeCommand({
              command: applyTool({
                phase: "up",
                locations: [artboardPos].map(toMutableTuple),
                tool: activeTool,
              }),
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
