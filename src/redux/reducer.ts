import { createReducer } from "@reduxjs/toolkit";
import * as actions from "./actions";
import * as thunkActions from "./thunks";
import * as M from "../model";
import { State } from "./types";

const initialState: State = {
  sprite: M.Sprite.create(),
  activeChange: [],
  undoBuffer: [],

  history: [],
  historyCursor: -1,
};

export default createReducer(initialState, (builder) =>
  builder
    .addCase(actions.appendChange, (state, action) => {
      state.activeChange.push(action.payload);
    })
    .addCase(actions.replacePixels, (state, action) => {
      M.Sprite.setPixelsRGBA(
        state.sprite,
        action.payload.locations,
        action.payload.content
      );
      M.Sprite.updateEditHash(state.sprite);
    })
    .addCase(actions.pushSpriteHistory, (state) => {
      if (state.historyCursor < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyCursor - 1);
      }
      state.history.push(
        actions.putImageData(Uint8ClampedArray.from(state.sprite.imageData))
      );
    })
    .addCase(actions.putImageData, (state, action) => {
      if (action.payload.length !== state.sprite.imageData.length) {
        throw new Error("Image size mismatch");
      }
      state.sprite.imageData.set(action.payload);
    })
    .addCase(thunkActions.undo.fulfilled, (state) => {
      state.undoBuffer = [];
    })
    .addCase(thunkActions.commitChange.fulfilled, (state) => {
      state.activeChange = [];
    })
);
