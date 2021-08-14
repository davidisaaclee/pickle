import { State } from "./types";
import * as M from "../model";

export const activeSprite = (state: State): M.Sprite => {
  return state.present.activeChange.reduce((sprite, { locations, content }) => {
    M.Sprite.setPixelsRGBA(sprite, locations, content);
    return sprite;
  }, M.Sprite.clone(state.present.sprite));
};
