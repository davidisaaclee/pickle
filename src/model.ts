import { ReadonlyVec2 } from "gl-matrix";

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

type PaletteRef = number;

type Instruction =
  | { type: "clear-pixels"; locations: PixelLocation[] }
  | { type: "write-pixels"; locations: PixelLocation[]; content: PaletteRef };

interface Commit {
  hash: string;
  instructions: Instruction[];
}

export interface Sprite {
  commits: Commit[];
  size: PixelVec2;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Sprite = {
  create({ size = [16, 16], commits = [] }: Partial<Sprite> = {}): Sprite {
    return { commits, size };
  },
};
