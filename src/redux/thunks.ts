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
  // TODO
  // const activeChange = getState().present.activeChange;
  // activeChange.forEach(dispatch);
});

export const applyTool = createAsyncThunk<
  void,
  {
    tool: M.Tool;
    locations: [number, number][];
    phase: "down" | "move";
  },
  ThunkApiConfig
>("applyTool", (params, { dispatch }) => {
  switch (params.tool) {
    case "pen":
      dispatch(
        actions.appendChange({
          locations: params.locations,
          content: [255, 0, 0, 255],
        })
      );
      return;

    case "eraser":
      dispatch(
        actions.appendChange({
          locations: params.locations,
          content: [0, 0, 0, 0],
        })
      );
      return;

    default:
      return absurd(params.tool);
  }
});
