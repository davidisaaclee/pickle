import { inRange, range } from "lodash";
import { v4 as uuid } from "uuid";
import { Lens } from "./utility/Lens";
import { vec2 } from "./utility/gl-matrix";
import * as ImageDataUtils from "./utility/ImageData";

export type PixelContent = [number, number, number, number];

const _toolSet = {
  pen: true,
  eraser: true,
  bucket: true,
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
      imageData: ImageDataUtils.clone(other.imageData),
    };
  },

  getSize(spr: Sprite): [number, number] {
    return [spr.imageData.width, spr.imageData.height];
  },

  getImageData(spr: Sprite): ImageData {
    return spr.imageData;
  },

  makeImageDataForSlice(
    spr: Sprite,
    [offsetX, offsetY]: PixelVec2,
    [targetWidth, targetHeight]: PixelVec2,
    out?: ImageData
  ): ImageData {
    if (out != null) {
      if (out.height !== targetHeight || out.width !== targetWidth) {
        throw new Error("Size mismatch");
      }
    }

    const [sourceWidth, sourceHeight] = Sprite.getSize(spr);

    if (!inRange(offsetX, 0, sourceWidth + 1)) {
      throw new Error("Requested out-of-range slice");
    }

    if (!inRange(offsetX + targetWidth, 0, sourceWidth + 1)) {
      throw new Error("Requested out-of-range slice");
    }

    if (!inRange(offsetY, 0, sourceHeight + 1)) {
      throw new Error("Requested out-of-range slice");
    }
    if (!inRange(offsetY + targetHeight, 0, sourceHeight + 1)) {
      throw new Error("Requested out-of-range slice");
    }

    const result = out ?? new ImageData(targetWidth, targetHeight);

    for (const targetRow of range(targetHeight)) {
      const sourceOffset = ((offsetY + targetRow) * sourceWidth + offsetX) * 4;
      const targetOffset = targetRow * targetWidth * 4;

      result.data.set(
        spr.imageData.data.subarray(
          sourceOffset,
          sourceOffset + targetWidth * 4
        ),
        targetOffset
      );
    }

    return result;
  },

  setPixelsRGBA(
    sprite: Sprite,
    pixelLocations: Array<readonly [number, number]>,
    rgba: [number, number, number, number]
  ): void {
    for (const pixelLocation of pixelLocations) {
      if (
        vec2.x(pixelLocation) < 0 ||
        vec2.x(pixelLocation) >= sprite.imageData.width
      ) {
        return;
      }
      if (
        vec2.y(pixelLocation) < 0 ||
        vec2.y(pixelLocation) >= sprite.imageData.height
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

  getPixel(sprite: Sprite, pixelLocation: PixelLocation): PixelContent {
    const spriteSize = Sprite.getSize(sprite);
    if (
      vec2.x(pixelLocation) < 0 ||
      vec2.x(pixelLocation) >= vec2.x(spriteSize)
    ) {
      throw new Error("Out of bounds");
    }
    if (
      vec2.y(pixelLocation) < 0 ||
      vec2.y(pixelLocation) >= vec2.y(spriteSize)
    ) {
      throw new Error("Out of bounds");
    }
    const offset =
      (vec2.x(pixelLocation) + vec2.x(spriteSize) * vec2.y(pixelLocation)) * 4;
    return Array.from(sprite.imageData.data.slice(offset, offset + 4)) as [
      number,
      number,
      number,
      number
    ];
  },

  updateEditHash(s: Sprite): void {
    s.editHash = uuid();
  },

  overlaySprite(
    out: Sprite,
    { spriteToOverlay }: { spriteToOverlay: Sprite }
  ): void {
    if (
      out.imageData.width !== spriteToOverlay.imageData.width ||
      out.imageData.height !== spriteToOverlay.imageData.height
    ) {
      throw new Error();
    }

    for (
      let pixelIndex = 0;
      pixelIndex <
      spriteToOverlay.imageData.width * spriteToOverlay.imageData.height;
      pixelIndex++
    ) {
      const offset = pixelIndex * 4;
      const alpha = spriteToOverlay.imageData.data[offset + 3];
      if (alpha === 0) {
        continue;
      }
      out.imageData.data[offset + 0] =
        spriteToOverlay.imageData.data[offset + 0];
      out.imageData.data[offset + 1] =
        spriteToOverlay.imageData.data[offset + 1];
      out.imageData.data[offset + 2] =
        spriteToOverlay.imageData.data[offset + 2];
      out.imageData.data[offset + 3] = 0xff;
    }
  },

  serialize(spr: Sprite): string {
    return JSON.stringify({
      size: [spr.imageData.width, spr.imageData.height],
      data: Array.from(spr.imageData.data),
    });
  },

  deserialize(serialized: string): Sprite {
    const obj = JSON.parse(serialized);
    if (obj.size == null) {
      throw new Error();
    }
    if (obj.data == null) {
      throw new Error();
    }
    if (
      !(obj.size instanceof Array) ||
      obj.size.length !== 2 ||
      obj.size.some((n: any) => typeof n !== "number")
    ) {
      throw new Error();
    }
    if (
      !(obj.data instanceof Array) ||
      obj.size.some((n: any) => typeof n !== "number")
    ) {
      throw new Error();
    }

    const out = Sprite.create({
      size: [obj.size[0], obj.size[1]],
    });
    out.imageData.data.set(obj.data);
    return out;
  },

  isPointInside(sprite: Sprite, [x, y]: PixelVec2): boolean {
    const [width, height] = Sprite.getSize(sprite);
    return x >= 0 && x < width && y >= 0 && y < height;
  },
};

export interface Animation {
  sprites: Sprite[];
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Animation = {
  deepClone(animation: Animation): Animation {
    return {
      sprites: animation.sprites.map(Sprite.deepClone),
    };
  },

  appendEmptyFrame(animation: Animation): Sprite {
    return Animation.insertEmptyFrame(animation, animation.sprites.length);
  },

  insertEmptyFrame(animation: Animation, index: number): Sprite {
    if (index < 0 || index > animation.sprites.length) {
      throw new Error();
    }

    const sprite = Sprite.create({
      size:
        animation.sprites[0] == null
          ? undefined
          : Sprite.getSize(animation.sprites[0]),
    });
    animation.sprites.splice(index, 0, sprite);
    return sprite;
  },

  appendDuplicateFrame(animation: Animation, frameIndex: number): Sprite {
    const sprite = Sprite.deepClone(animation.sprites[frameIndex]);
    animation.sprites.splice(frameIndex + 1, 0, sprite);
    return sprite;
  },

  frameLens(frameIndex: number): Lens<Animation, Sprite> {
    return Lens.from<Animation>().prop("sprites", frameIndex);
  },
};

export interface AnimationPlayback {
  currentFrame: number;
  isPlaying: boolean;
}
