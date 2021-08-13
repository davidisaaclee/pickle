import { AnyAction } from "@reduxjs/toolkit";
import { StateWithHistory } from "redux-undo";
import * as M from "../model";

export interface StateWithoutHistory {
  sprite: M.Sprite;
  activeChange: AnyAction[];
}

export type State = StateWithHistory<StateWithoutHistory>;
