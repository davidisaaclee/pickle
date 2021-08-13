import { createAction, AnyAction } from "@reduxjs/toolkit";
import * as M from "../model";

export const replacePixels = createAction(
  "replacePixels",
  ({
    locations,
    content,
  }: {
    locations: (readonly [number, number])[];
    content: M.PixelContent;
  }) => ({
    payload: {
      locations: locations.map(
        ([x, y]) => [Math.floor(x), Math.floor(y)] as const
      ),
      content,
    },
  })
);

export const pushSpriteHistory = createAction("pushSpriteHistory");

export const putImageData = createAction<Uint8ClampedArray>("putImageData");

export const appendChange = createAction<AnyAction>("appendChange");
