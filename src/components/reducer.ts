import { clamp } from "lodash";
import { createReducer, createAction } from "@reduxjs/toolkit";
import * as M from "../model";

interface State {
  history: {
    frames: Array<M.Animation>;
    cursor: number;
  };
  playback: M.AnimationPlayback;
  activeTool: M.Tool;
  activeColor: M.PixelContent;
}

export const initialState: State = {
  history: {
    frames: [{ sprites: [M.Sprite.create()] }],
    cursor: 0,
  },
  playback: { currentFrame: 0, isPlaying: false },
  activeTool: "pen",
  activeColor: [255, 0, 0, 255],
};

export const actions = {
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
  movePlayhead: createAction<number>("movePlayhead"),
} as const;

export const selectors = {
  activeAnimation(state: State): M.Animation {
    return state.history.frames[state.history.cursor];
  },
  activeSprite(state: State): M.Sprite {
    const playback = state.playback;
    return selectors.activeAnimation(state).sprites[playback.currentFrame];
  },
};

export const reducer = createReducer(initialState, (builder) => {
  builder
    .addCase(actions.undo, (state) => {
      state.history.cursor = Math.max(0, state.history.cursor - 1);
    })
    .addCase(actions.redo, (state) => {
      state.history.cursor = Math.min(
        state.history.frames.length - 1,
        state.history.cursor + 1
      );
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
      if (state.history.cursor < state.history.frames.length - 1) {
        state.history.frames.splice(
          state.history.cursor + 1,
          state.history.frames.length - state.history.cursor
        );
      }

      state.history.frames.push(
        M.Animation.deepClone(
          state.history.frames[state.history.frames.length - 1]
        )
      );

      state.history.cursor += 1;
    })
    .addCase(actions.addBlankAnimationFrame, (state) => {
      const sprite = M.Animation.appendEmptyFrame(
        selectors.activeAnimation(state)
      );
      M.Sprite.setPixelsRGBA(sprite, [[1, 1]], [0, 0xff, 0xff, 0xff]);
      state.playback.currentFrame += 1;
    })
    .addCase(actions.movePlayhead, (state, { payload: frame }) => {
      console.log(frame);
      state.playback.currentFrame = clamp(
        frame,
        0,
        selectors.activeAnimation(state).sprites.length
      );
    })
    .addMatcher(
      () => true,
      (state, action) => {
        console.log("Action:", action);
        return state;
      }
    );
});

/*
type AppAction = ReturnType<typeof actions[keyof typeof actions]>;
export const reducer = (state: State, action: AppAction): State => {
  console.log("action:", action);
  if (actions.updateActiveSprite.match(action)) {
    const out = {
      ...state,
      history: {
        ...state.history,
        frames: [
          ...state.history.frames.slice(0, state.history.cursor),
          action.payload,
          ...state.history.frames.slice(
            state.history.cursor + 1,
            state.history.frames.length
          ),
        ],
      },
    };
    const frames = out.history.frames;
    console.log(
      action.type,
      frames[frames.length - 1].imageData.data.slice(0, 4),
      frames[frames.length - 2].imageData.data.slice(0, 4)
    );
    return out;
  } else if (actions.paintPixels.match(action)) {
    const { locations, content } = action.payload;
    if (locations.length === 0) {
      return state;
    }
    const activeSprite = M.Sprite.shallowClone(
      state.history.frames[state.history.cursor]
    );
    M.Sprite.setPixelsRGBA(activeSprite, locations, content);

    return {
      ...state,
      history: {
        ...state.history,
        frames: [
          ...state.history.frames.slice(0, state.history.cursor),
          activeSprite,
          ...state.history.frames.slice(
            state.history.cursor + 1,
            state.history.frames.length
          ),
        ],
      },
    };
  } else if (actions.pushHistory.match(action)) {
    const frames = [...state.history.frames];
    if (state.history.cursor < state.history.frames.length - 1) {
      frames.splice(
        state.history.cursor + 1,
        state.history.frames.length - state.history.cursor
      );
    }
    frames.push(M.Sprite.deepClone(frames[frames.length - 1]));
    console.log(
      action.type,
      frames[frames.length - 1].imageData.data.slice(0, 4),
      frames[frames.length - 2].imageData.data.slice(0, 4)
    );

    return {
      ...state,
      history: {
        ...state.history,
        frames,
        cursor: state.history.cursor + 1,
      },
    };
  } else if (actions.setActiveTool.match(action)) {
    return {
      ...state,
      activeTool: action.payload,
    };
  } else if (actions.setActiveColor.match(action)) {
    return {
      ...state,
      activeColor: action.payload,
    };
  } else if (actions.undo.match(action)) {
    return {
      ...state,
      history: {
        ...state.history,
        cursor: Math.max(0, state.history.cursor - 1),
      },
    };
  } else if (actions.redo.match(action)) {
    return {
      ...state,
      history: {
        ...state.history,
        cursor: Math.min(
          state.history.frames.length - 1,
          state.history.cursor + 1
        ),
      },
    };
  } else {
    return state;
  }
};
*/
