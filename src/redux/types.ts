import { StateWithHistory } from "redux-undo";
import * as M from "../model";

export interface StateWithoutHistory {
  sprite: M.Sprite;
  activeChange: Array<{
    locations: M.PixelLocation[];
    content: M.PixelContent;
  }>;
}

export type State = StateWithHistory<StateWithoutHistory>;
