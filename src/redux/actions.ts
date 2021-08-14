import { createAction, AnyAction } from "@reduxjs/toolkit";
import * as M from "../model";

export const replacePixels = createAction(
  "replacePixels",
  (
    changes: Array<{
      locations: (readonly [number, number])[];
      content: M.PixelContent;
    }>
  ) => ({
    payload: changes.map(({ locations, content }) => ({
      locations: locations.map(
        ([x, y]) => [Math.floor(x), Math.floor(y)] as const
      ),
      content,
    })),
  })
);

export const appendChange = createAction(
  "appendChange",
  (params: { locations: M.PixelLocation[]; content: M.PixelContent }) => ({
    payload: {
      ...params,
      locations: params.locations.map(
        (loc) => [Math.floor(loc[0]), Math.floor(loc[1])] as [number, number]
      ),
    },
  })
);

export const undo = createAction("undo");
export const redo = createAction("redo");
