import { AnyAction } from "@reduxjs/toolkit";
import * as M from "../model";

export interface State {
  sprite: M.Sprite;
  activeChange: AnyAction[];
  undoBuffer: AnyAction[];

  // A list of actions to undo / redo history. If historyCursor == i, then
  // dispatch(history[i]) will undo the most recent command. Alternatively,
  // dispatch(history[i+1]) will redo the most recently undone command
  history: AnyAction[];
  historyCursor: number;
}
