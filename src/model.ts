import { v4 as uuid } from "uuid";
import { ReadonlyVec2, vec2 } from "./utility/gl-matrix";

export type PixelContent = [number, number, number, number];

const _toolSet = {
  pen: true,
  eraser: true,
} as const;

export type Tool = keyof typeof _toolSet;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Tool = {
  allTools() {
    return Object.keys(_toolSet);
  },
};

export type PixelVec2 = ReadonlyVec2;
export type PixelLocation = PixelVec2;

export interface Sprite {
  editHash: string;
  size: PixelVec2;
  imageData: Uint8ClampedArray;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sprite = {
  create({ size = [16, 16] }: Partial<Sprite> = {}): Sprite {
    return {
      editHash: uuid(),
      size,
      imageData: new Uint8ClampedArray(vec2.x(size) * vec2.y(size) * 4),
    };
  },

  clone(other: Sprite): Sprite {
    return {
      ...other,
      size: vec2.clone(other.size),
      imageData: Uint8ClampedArray.from(other.imageData),
    };
  },

  setPixelsRGBA(
    sprite: Sprite,
    pixelLocations: Array<PixelLocation>,
    rgba: [number, number, number, number]
  ): void {
    for (const pixelLocation of pixelLocations) {
      if (
        vec2.x(pixelLocation) < 0 ||
        vec2.x(pixelLocation) >= vec2.x(sprite.size)
      ) {
        return;
      }
      if (
        vec2.y(pixelLocation) < 0 ||
        vec2.y(pixelLocation) >= vec2.y(sprite.size)
      ) {
        return;
      }
      const offset =
        (vec2.x(pixelLocation) + vec2.x(sprite.size) * vec2.y(pixelLocation)) *
        4;
      sprite.imageData.set(rgba, offset);
    }
  },

  getPixel(sprite: Sprite, pixelLocation: PixelLocation): PixelContent {
    if (
      vec2.x(pixelLocation) < 0 ||
      vec2.x(pixelLocation) >= vec2.x(sprite.size)
    ) {
      throw new Error("Out of bounds");
    }
    if (
      vec2.y(pixelLocation) < 0 ||
      vec2.y(pixelLocation) >= vec2.y(sprite.size)
    ) {
      throw new Error("Out of bounds");
    }
    const offset =
      (vec2.x(pixelLocation) + vec2.x(sprite.size) * vec2.y(pixelLocation)) * 4;
    return Array.from(sprite.imageData.slice(offset, offset + 5)) as [
      number,
      number,
      number,
      number
    ];
  },

  updateEditHash(s: Sprite): void {
    s.editHash = uuid();
  },
};
