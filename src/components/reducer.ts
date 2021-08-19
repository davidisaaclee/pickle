import { clamp } from "lodash";
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
  applyEditsAcrossSprites: false,
};

export const actions = {
  paintBucket:
    createAction<{ location: M.ReadonlyPixelVec2; content: M.PixelContent }>(
      "paintBucket"
    ),
  paintPixels:
    createAction<{ locations: M.ReadonlyPixelVec2[]; content: M.PixelContent }>(
      "paintPixels"
    ),
  translateSprite:
    createAction<{ offset: M.ReadonlyPixelVec2 }>("translateSprite"),
  pickColorAtLocation: createAction<M.ReadonlyPixelVec2>("pickColorAtLocation"),
  pushHistory: createAction("pushHistory"),
  setActiveTool: createAction<M.Tool>("setActiveTool"),
  setActiveColor: createAction<M.PixelContent>("setActiveColor"),
  undo: createAction("undo"),
  redo: createAction("redo"),
  deleteActiveSprite: createAction("deleteActiveSprite"),
  addBlankAnimationFrame: createAction("addBlankAnimationFrame"),
  duplicateCurrentAnimationFrame: createAction(
    "duplicateCurrentAnimationFrame"
  ),
  setApplyEditsAcrossSprites: createAction<boolean>(
    "setApplyEditsAcrossSprites"
  ),
  movePlayhead: createAction<number>("movePlayhead"),
  copyFrame: createAction("copyFrame"),
  pasteFrame: createAction("pasteFrame"),
} as const;

export const selectors = {
  activeAnimation: L.activeAnimation.get,
  currentFrameIndex: L.currentFrameIndex.get,
  activeSprite: L.activeSprite.get,
  activeColor: L.activeColor.get,
  applyEditsAcrossSprites: L.applyEditsAcrossSprites.get,
  spritesForEdits(state: State): M.Sprite[] {
    if (L.applyEditsAcrossSprites.get(state)) {
      return L.activeAnimation.get(state).sprites;
    } else {
      return [L.activeSprite.get(state)];
    }
  },
};

export const reducer = createReducer(initialState, (builder) => {
  builder
    .addCase(
      actions.setApplyEditsAcrossSprites,
      (state, { payload: applyEditsAcrossSprites }) => {
        L.applyEditsAcrossSprites.set(state, applyEditsAcrossSprites);
      }
    )
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
        selectors.spritesForEdits(state).forEach((sprite) => {
          M.Sprite.setPixelsRGBA(sprite, locations, content);
          M.Sprite.updateEditHash(sprite);
        });
      }
    )
    .addCase(actions.translateSprite, (state, { payload: { offset } }) => {
      selectors.spritesForEdits(state).forEach((sprite) => {
        M.Sprite.translatePixels(sprite, offset);
        M.Sprite.updateEditHash(sprite);
      });
    })
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
        const hashLocation = (loc: readonly [number, number]) => loc.join(", ");

        selectors.spritesForEdits(state).forEach((sprite) => {
          if (!M.Sprite.isPointInside(sprite, location)) {
            return;
          }

          const matchColor = M.Sprite.getPixel(sprite, location);
          const isInside = (point: readonly [number, number]) =>
            M.Sprite.isPointInside(sprite, point) &&
            arrayEquals(M.Sprite.getPixel(sprite, point), matchColor);

          let count = 0;
          const queue: Array<readonly [number, number]> = [location];
          const checked: Record<string, boolean> = {};
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
        });
      }
    )
    .addCase(actions.copyFrame, (state) => {
      localStorage.setItem(
        "pasteboard",
        M.Sprite.serialize(L.activeSprite.get(state))
      );
      return state;
    })
    .addCase(actions.pasteFrame, (state) => {
      const pasted = localStorage.getItem("pasteboard");
      if (pasted == null) {
        return;
      }
      const spriteToOverlay = M.Sprite.deserialize(pasted);

      L.activeAnimation.update(state, (animation) => {
        const insertIndex = L.currentFrameIndex.get(state) + 1;
        M.Animation.insertEmptyFrame(animation, insertIndex);
        M.Animation.frameLens(insertIndex).update(animation, (frame) => {
          M.Sprite.overlaySprite(frame, { spriteToOverlay });
          return frame;
        });
        return animation;
      });

      L.currentFrameIndex.update(state, (f) => f + 1);
    })
    .addCase(actions.pickColorAtLocation, (state, { payload: location }) => {
      const loc = location.map(Math.floor) as [number, number];
      if (!M.Sprite.isPointInside(L.activeSprite.get(state), loc)) {
        state.activeTool = "eraser";
        return;
      }

      const color = M.Sprite.getPixel(L.activeSprite.get(state), loc);
      L.activeColor.set(state, color);
    })
    .addCase(actions.deleteActiveSprite, (state) => {
      if (L.activeAnimation.get(state).sprites.length <= 1) {
        return;
      }

      L.activeAnimation.update(state, (anim) => {
        anim.sprites.splice(L.currentFrameIndex.get(state), 1);
        return anim;
      });
      L.currentFrameIndex.update(state, (f) => Math.max(0, f - 1));
    })
    .addCase(actions.movePlayhead, (state, { payload: frame }) => {
      L.currentFrameIndex.set(
        state,
        clamp(frame, 0, selectors.activeAnimation(state).sprites.length)
      );
    });
});
