import { inRange, clamp } from "lodash";
import { createReducer, createAction } from "@reduxjs/toolkit";
import arrayEquals from "../utility/arrayEquals";
import * as M from "../model";
import { State } from "./state";
import * as L from "./lenses";

export const initialState: State = {
  history: {
    past: [],
    present: {
      animation: { sprites: [M.Sprite.create()] },
      playback: { currentFrame: 0, isPlaying: false },
    },
    future: [],
  },
  activeTool: "pen",
  activeColor: [41, 208, 208, 0xff],
};

export const actions = {
  paintBucket:
    createAction<{ location: M.PixelLocation; content: M.PixelContent }>(
      "paintBucket"
    ),
  paintPixels:
    createAction<{ locations: M.PixelLocation[]; content: M.PixelContent }>(
      "paintPixels"
    ),
  pushHistory: createAction("pushHistory"),
  setActiveTool: createAction<M.Tool>("setActiveTool"),
  setActiveColor: createAction<M.PixelContent>("setActiveColor"),
  undo: createAction("undo"),
  redo: createAction("redo"),
  addBlankAnimationFrame: createAction("addBlankAnimationFrame"),
  duplicateCurrentAnimationFrame: createAction(
    "duplicateCurrentAnimationFrame"
  ),
  movePlayhead: createAction<number>("movePlayhead"),
} as const;

export const selectors = {
  activeAnimation: L.activeAnimation.get,
  currentFrameIndex: L.currentFrameIndex.get,
  activeSprite: L.activeSprite.get,
  activeColor: L.activeColor.get,
};

export const reducer = createReducer(initialState, (builder) => {
  builder
    .addCase(actions.undo, (state) => {
      const nextPresent = state.history.past.pop();
      if (nextPresent == null) {
        return;
      }
      state.history.future.unshift(state.history.present);
      state.history.present = nextPresent;
    })
    .addCase(actions.redo, (state) => {
      const nextPresent = state.history.future.shift();
      if (nextPresent == null) {
        return;
      }
      state.history.past.push(state.history.present);
      state.history.present = nextPresent;
    })
    .addCase(
      actions.paintPixels,
      (state, { payload: { locations, content } }) => {
        const activeSprite = selectors.activeSprite(state);
        M.Sprite.setPixelsRGBA(activeSprite, locations, content);
        M.Sprite.updateEditHash(activeSprite);
      }
    )
    .addCase(actions.setActiveTool, (state, { payload: nextActiveTool }) => {
      state.activeTool = nextActiveTool;
    })
    .addCase(actions.setActiveColor, (state, { payload: nextActiveColor }) => {
      state.activeColor = nextActiveColor;
    })
    .addCase(actions.pushHistory, (state) => {
      state.history.future = [];
      state.history.past.push(state.history.present);
      state.history.present = {
        ...state.history.present,
        animation: M.Animation.deepClone(state.history.present.animation),
      };
    })
    .addCase(actions.addBlankAnimationFrame, (state) => {
      const sprite = M.Animation.appendEmptyFrame(
        selectors.activeAnimation(state)
      );
      M.Sprite.setPixelsRGBA(sprite, [[1, 1]], [0, 0xff, 0xff, 0xff]);
      L.currentFrameIndex.update(state, (f) => f + 1);
    })
    .addCase(actions.duplicateCurrentAnimationFrame, (state) => {
      L.activeAnimation.update(state, (anim) => {
        M.Animation.appendDuplicateFrame(anim, L.currentFrameIndex.get(state));
        return anim;
      });
      L.currentFrameIndex.update(state, (f) => f + 1);
    })
    .addCase(
      actions.paintBucket,
      (state, { payload: { location, content } }) => {
        let count = 0;
        const queue: Array<readonly [number, number]> = [location];
        const checked: Record<string, boolean> = {};

        const hashLocation = (loc: readonly [number, number]) => loc.join(", ");

        const sprite = selectors.activeSprite(state);
        const [spriteWidth, spriteHeight] = M.Sprite.getSize(sprite);

        const matchColor = M.Sprite.getPixel(sprite, location);

        const isInside = ([x, y]: readonly [number, number]) =>
          inRange(x, 0, spriteWidth) &&
          inRange(y, 0, spriteHeight) &&
          arrayEquals(M.Sprite.getPixel(sprite, [x, y]), matchColor);

        while (queue.length > 0) {
          count++;
          if (count > 9999) {
            throw new Error(
              "Bucket is taking too long! Stopping to prevent locking up the client."
            );
          }
          const n = queue.pop();
          if (n == null) {
            break;
          }

          const hashed = hashLocation(n);
          if (checked[hashed]) {
            continue;
          }

          checked[hashed] = true;

          const [x, y] = n;

          if (isInside(n)) {
            M.Sprite.setPixelsRGBA(sprite, [n], content);

            (
              [
                [x - 1, y + 0],
                [x + 1, y + 0],
                [x + 0, y - 1],
                [x + 0, y + 1],
              ] as const
            ).forEach((p) => {
              if (isInside(p)) {
                queue.push(p);
              }
            });
          }
        }

        M.Sprite.updateEditHash(sprite);
      }
    )
    .addCase(actions.movePlayhead, (state, { payload: frame }) => {
      L.currentFrameIndex.set(
        state,
        clamp(frame, 0, selectors.activeAnimation(state).sprites.length)
      );
    });
});
