import { createAsyncThunk } from "@reduxjs/toolkit";
import absurd from "../utility/absurd";
import * as actions from "./actions";
import * as M from "../model";
import { Dispatch } from "./dispatch";
import { State } from "./types";

type UntypedDispatchThunkApiConfig = { state: State };
type ThunkApiConfig = UntypedDispatchThunkApiConfig & { dispatch: Dispatch };

export const commitChange = createAsyncThunk<
  void,
  void,
  UntypedDispatchThunkApiConfig
>("commitChange", (_, { dispatch, getState }) => {
  dispatch(actions.pushSpriteHistory());
  const activeChange = getState().activeChange;
  activeChange.forEach(dispatch);
});

export const applyTool = createAsyncThunk<
  void,
  {
    tool: M.Tool;
    locations: [number, number][];
    phase: "down" | "move" | "up";
  },
  ThunkApiConfig
>("applyTool", (params, { dispatch }) => {
  if (params.phase === "up") {
    dispatch(commitChange());
    return;
  }

  switch (params.tool) {
    case "pen":
      dispatch(
        actions.appendChange(
          actions.replacePixels({
            locations: params.locations,
            content: [255, 0, 0, 255],
          })
        )
      );
      return;

    case "eraser":
      dispatch(
        actions.appendChange(
          actions.replacePixels({
            locations: params.locations,
            content: [0, 0, 0, 0],
          })
        )
      );
      return;

    default:
      return absurd(params.tool);
  }
});

export const undo = createAsyncThunk<void, void, UntypedDispatchThunkApiConfig>(
  "undo",
  (_, { dispatch, getState }) => {
    getState().undoBuffer.forEach(dispatch);
  }
);
