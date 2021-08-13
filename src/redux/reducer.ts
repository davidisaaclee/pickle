import { createReducer } from "@reduxjs/toolkit";
import undoable from "redux-undo";
import * as actions from "./actions";
import * as thunkActions from "./thunks";
import * as M from "../model";
import { StateWithoutHistory } from "./types";

const initialState: StateWithoutHistory = {
  sprite: M.Sprite.create(),
  activeChange: [],
};

const reducer = createReducer(initialState, (builder) =>
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
    .addCase(thunkActions.commitChange.fulfilled, (state) => {
      state.activeChange = [];
    })
);

export default undoable(reducer, {
  undoType: actions.undo.type,
  redoType: actions.redo.type,
});
