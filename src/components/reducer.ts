import { createReducer, createAction } from "@reduxjs/toolkit";
import * as M from "../model";

interface State {
  history: {
    frames: Array<M.Sprite>;
    cursor: number;
  };
  activeTool: M.Tool;
  activeColor: M.PixelContent;
}

export const initialState: State = {
  history: {
    frames: [M.Sprite.create()],
    cursor: 0,
  },
  activeTool: "pen",
  activeColor: [255, 0, 0, 255],
};

export const actions = {
  updateActiveSprite: createAction<M.Sprite>("updateActiveSprite"),
  pushHistory: createAction("pushHistory"),
  setActiveTool: createAction<M.Tool>("setActiveTool"),
  setActiveColor: createAction<M.PixelContent>("setActiveColor"),
  undo: createAction("undo"),
  redo: createAction("redo"),
};

export const selectors = {
  activeSprite(state: State): M.Sprite {
    return state.history.frames[state.history.cursor];
  },
};

export const reducer = createReducer(initialState, (builder) => {
  builder
    .addCase(actions.undo, (state) => {
      state.history.cursor = Math.max(0, state.history.cursor - 1);
    })
    .addCase(actions.redo, (state) => {
      state.history.cursor = Math.min(
        state.history.frames.length - 1,
        state.history.cursor + 1
      );
    })
    .addCase(actions.setActiveTool, (state, { payload: nextActiveTool }) => {
      state.activeTool = nextActiveTool;
    })
    .addCase(actions.setActiveColor, (state, { payload: nextActiveColor }) => {
      state.activeColor = nextActiveColor;
    })
    .addCase(actions.updateActiveSprite, (state, { payload: sprite }) => {
      state.history.frames[state.history.cursor] = sprite;
    })
    .addCase(actions.pushHistory, (state) => {
      if (state.history.cursor < state.history.frames.length - 1) {
        state.history.frames.splice(
          state.history.cursor + 1,
          state.history.frames.length - state.history.cursor
        );
      }
      state.history.frames.push(
        M.Sprite.deepClone(
          state.history.frames[state.history.frames.length - 1]
        )
      );
    });
});
