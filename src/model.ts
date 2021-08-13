import { ReadonlyVec2, vec2 } from "./utility/gl-matrix";

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
  size: PixelVec2;
  imageData: Uint8ClampedArray;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sprite = {
  create({ size = [16, 16] }: Partial<Sprite> = {}): Sprite {
    return {
      size,
      imageData: new Uint8ClampedArray(vec2.x(size) * vec2.y(size) * 4),
    };
  },

  setPixelRGBA(
    sprite: Sprite,
    pixelLocation: PixelLocation,
    rgba: [number, number, number, number]
  ): void {
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
      (vec2.x(pixelLocation) + vec2.x(sprite.size) * vec2.y(pixelLocation)) * 4;
    sprite.imageData.set(rgba, offset);
  },
};
