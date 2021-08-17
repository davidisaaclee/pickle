import { Lens } from "../utility/Lens";
import * as M from "../model";
import { State } from "./state";

export const activeAnimation = Lens.from<State>().prop(
  "history",
  "present",
  "animation"
);

export const currentFrameIndex = Lens.from<State>().prop(
  "history",
  "present",
  "playback",
  "currentFrame"
);

export const activeColor = Lens.from<State>().prop("activeColor");

export const activeSprite = Lens.of<State, M.Sprite>({
  get(state) {
    return activeAnimation.get(state).sprites[currentFrameIndex.get(state)];
  },
  set(state, sprite) {
    activeAnimation.get(state).sprites[currentFrameIndex.get(state)] = sprite;
    return state;
  },
});
