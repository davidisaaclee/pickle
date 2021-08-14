import { v4 as uuid } from "uuid";
import { vec2 } from "./utility/gl-matrix";

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

export type PixelVec2 = [number, number];
export type PixelLocation = PixelVec2;

export interface Sprite {
  editHash: string;
  imageData: ImageData;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sprite = {
  create({ size = [16, 16] }: { size?: [number, number] } = {}): Sprite {
    return {
      editHash: uuid(),
      imageData: new ImageData(size[0], size[1]),
    };
  },

  shallowClone(other: Sprite): Sprite {
    return {
      ...other,
    };
  },

  deepClone(other: Sprite): Sprite {
    return {
      ...other,
      imageData: ((img) => {
        img.data.set(other.imageData.data);
        return img;
      })(new ImageData(other.imageData.width, other.imageData.height)),
    };
  },

  getSize(spr: Sprite): [number, number] {
    return [spr.imageData.width, spr.imageData.height];
  },

  getImageData(spr: Sprite): ImageData {
    return spr.imageData;
  },

  setPixelsRGBA(
    sprite: Sprite,
    pixelLocations: Array<readonly [number, number]>,
    rgba: [number, number, number, number]
  ): void {
    for (const pixelLocation of pixelLocations) {
      if (
        vec2.x(pixelLocation) < 0 ||
        vec2.x(pixelLocation) > sprite.imageData.width
      ) {
        return;
      }
      if (
        vec2.y(pixelLocation) < 0 ||
        vec2.y(pixelLocation) > sprite.imageData.height
      ) {
        return;
      }
      const offset =
        (vec2.x(pixelLocation) +
          sprite.imageData.width * vec2.y(pixelLocation)) *
        4;
      sprite.imageData.data.set(rgba, offset);
    }
  },

  /*
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
  */

  updateEditHash(s: Sprite): void {
    s.editHash = uuid();
  },
};
