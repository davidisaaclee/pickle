import { State } from "./types";
import * as actions from "./actions";
import * as M from "../model";

export const activeSprite = (state: State): M.Sprite => {
  return state.activeChange.reduce((sprite, action) => {
    if (actions.replacePixels.match(action)) {
      M.Sprite.setPixelsRGBA(
        sprite,
        action.payload.locations,
        action.payload.content
      );
    }
    return sprite;
  }, M.Sprite.clone(state.sprite));
};
