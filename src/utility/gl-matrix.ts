import {
  vec2,
  vec3,
  mat2d,
  mat4,
  quat,
  ReadonlyVec2,
  ReadonlyMat4,
  ReadonlyMat2d,
} from "gl-matrix";

export * from "gl-matrix";

interface PointerEventLike {
  clientX: number;
  clientY: number;

  currentTarget: { getBoundingClientRect(): { left: number; top: number } };
}

const extraVec2Methods = {
  x: (v: ReadonlyVec2) => v[0],
  y: (v: ReadonlyVec2) => v[1],
  setX: (v: vec2, x: number) => {
    v[0] = x;
  },
  setY: (v: vec2, y: number) => (v[1] = y),
  unit: (n: number, out: vec2 = vec2.create()) => {
    return vec2.set(out, n, n);
  },
  components: (v: vec2): [number, number] => [v[0], v[1]],

  toSize: (v: ReadonlyVec2) => ({ width: v[0], height: v[1] }),
  toXY: (v: ReadonlyVec2) => ({ x: v[0], y: v[1] }),
  toLeftTop: (v: ReadonlyVec2) => ({ left: v[0], top: v[1] }),
  toLeftBottom: (v: ReadonlyVec2) => ({ left: v[0], bottom: v[1] }),
  toTuple: (v: ReadonlyVec2): [number, number] => [v[0], v[1]],
  fromSize: (size: { width: number; height: number }) =>
    vec2.fromValues(size.width, size.height),
  fromXY: (xy: { x: number; y: number }) => vec2.fromValues(xy.x, xy.y),
  fromLeftTop: (
    { left, top }: { left: number; top: number },
    out: vec2 = vec2.create()
  ): vec2 => {
    vec2.set(out, left, top);
    return out;
  },

  transformSize: (out: vec2, v: ReadonlyVec2, xf: ReadonlyMat2d) => {
    const zero = vec2.zero(vec2.create());
    vec2.transformMat2d(zero, zero, xf);
    const extent = vec2.clone(v);
    vec2.transformMat2d(extent, extent, xf);
    return vec2.subtract(out, extent, zero);
  },

  reciprocal: (out: vec2, v: vec2) =>
    vec2.div(out, extraVec2Methods.unit(1), v),

  widthOverHeightAspectRatio: (v: vec2): number =>
    extraVec2Methods.x(v) / extraVec2Methods.y(v),

  midpoint: (v1: vec2, v2: vec2, out: vec2 = vec2.create()): vec2 => {
    vec2.sub(out, v2, v1);
    vec2.scale(out, out, 0.5);
    vec2.add(out, out, v1);
    return out;
  },

  dotProduct: (a: vec2, b: vec2): number => {
    const { x, y } = extraVec2Methods;
    return x(a) * x(b) + y(a) * y(b);
  },

  fromClientPosition: (
    event: { clientX: number; clientY: number },
    out: vec2 = vec2.create()
  ) => {
    vec2.set(out, event.clientX, event.clientY);
    return out;
  },
  fromClientWidthHeight: (event: {
    clientWidth: number;
    clientHeight: number;
  }) => vec2.fromValues(event.clientWidth, event.clientHeight),

  fromPointerEventRelativeToCurrentTarget: (
    event: PointerEventLike,
    out: vec2 = vec2.create()
  ) => {
    extraVec2Methods.fromClientPosition(event, out);
    vec2.sub(
      out,
      out,
      extraVec2Methods.fromLeftTop(event.currentTarget.getBoundingClientRect())
    );
    return out;
  },

  angleBetween: (a: vec2, b: vec2): number => {
    const { x, y } = extraVec2Methods;
    return Math.atan2(x(a) * y(b) - y(a) * x(b), x(a) * x(b) + y(a) * y(b));
  },

  centroid: (points: vec2[], out: vec2 = vec2.create()): vec2 => {
    vec2.zero(out);
    points.reduce((acc, elm) => vec2.add(acc, acc, elm), out);
    vec2.scale(out, out, 1 / points.length);
    return out;
  },

  /** Hash a vec2 into a string. Useful when attempting to memoize functions that take a vec2. */
  hash: (v: vec2): string => {
    return extraVec2Methods.toTuple(v).join(",");
  },
};

const enhancedVec2: typeof vec2 & typeof extraVec2Methods = Object.assign(
  {},
  vec2,
  extraVec2Methods
);

const extraMat2dMethods = {
  a: (mat: ReadonlyMat2d) => mat[0],
  b: (mat: ReadonlyMat2d) => mat[1],
  c: (mat: ReadonlyMat2d) => mat[2],
  d: (mat: ReadonlyMat2d) => mat[3],
  tx: (mat: ReadonlyMat2d) => mat[4],
  ty: (mat: ReadonlyMat2d) => mat[5],
  setTxTy: (out: mat2d, mat: ReadonlyMat2d, txty: vec2) => {
    mat2d.copy(out, mat);
    out[4] = extraVec2Methods.x(txty);
    out[5] = extraVec2Methods.y(txty);
    return out;
  },
  components: (
    mat: ReadonlyMat2d
  ): [number, number, number, number, number, number] => [
    extraMat2dMethods.a(mat),
    extraMat2dMethods.b(mat),
    extraMat2dMethods.c(mat),
    extraMat2dMethods.d(mat),
    extraMat2dMethods.tx(mat),
    extraMat2dMethods.ty(mat),
  ],

  toMat4: (mat: ReadonlyMat2d): mat4 => {
    return mat4.fromValues(
      extraMat2dMethods.a(mat),
      extraMat2dMethods.b(mat),
      0,
      0,

      extraMat2dMethods.c(mat),
      extraMat2dMethods.d(mat),
      0,
      0,

      0,
      0,
      1,
      0,

      extraMat2dMethods.tx(mat),
      extraMat2dMethods.ty(mat),
      0,
      1
    );
  },

  // Scale factor without rotation - e.g. if the matrix is
  // a pure 90° rotation transform, this will produce a
  // unit vector.
  scaleFactor: (mat: ReadonlyMat2d): Vec2 => {
    const zero = extraVec2Methods.unit(0);
    const unitX = vec2.fromValues(1, 0);
    const unitY = vec2.fromValues(0, 1);
    vec2.transformMat2d(zero, zero, mat);
    vec2.transformMat2d(unitX, unitX, mat);
    vec2.transformMat2d(unitY, unitY, mat);
    return vec2.fromValues(
      vec2.distance(zero, unitX),
      vec2.distance(zero, unitY)
    );
  },

  toCSSInstruction: (mat: ReadonlyMat2d) =>
    `matrix(${extraMat2dMethods.components(mat).join(", ")})`,

  byColumn3x3: (mat: mat2d): Float32Array =>
    Float32Array.from([
      extraMat2dMethods.a(mat),
      extraMat2dMethods.b(mat),
      0,
      extraMat2dMethods.c(mat),
      extraMat2dMethods.d(mat),
      0,
      extraMat2dMethods.tx(mat),
      extraMat2dMethods.ty(mat),
      1,
    ]),

  byRow3x3: (mat: mat2d): Float32Array =>
    Float32Array.from([
      extraMat2dMethods.a(mat),
      extraMat2dMethods.c(mat),
      extraMat2dMethods.tx(mat),
      extraMat2dMethods.b(mat),
      extraMat2dMethods.d(mat),
      extraMat2dMethods.ty(mat),
    ]),

  abcdtxty: (mat: ReadonlyMat2d): Float32Array =>
    Float32Array.from([
      extraMat2dMethods.a(mat),
      extraMat2dMethods.b(mat),
      extraMat2dMethods.c(mat),
      extraMat2dMethods.d(mat),
      extraMat2dMethods.tx(mat),
      extraMat2dMethods.ty(mat),
    ]),

  toComponents: (
    mat: ReadonlyMat2d
  ): {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
  } => ({
    a: extraMat2dMethods.a(mat),
    b: extraMat2dMethods.b(mat),
    c: extraMat2dMethods.c(mat),
    d: extraMat2dMethods.d(mat),
    tx: extraMat2dMethods.tx(mat),
    ty: extraMat2dMethods.ty(mat),
  }),
  fromComponents: (c: {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
  }) => mat2d.fromValues(c.a, c.b, c.c, c.d, c.tx, c.ty),
  translation: (mat: ReadonlyMat2d) =>
    vec2.fromValues(extraMat2dMethods.tx(mat), extraMat2dMethods.ty(mat)),

  /** Hash a mat2d into a string. Useful when attempting to memoize functions that take a mat2d. */
  hash: (xf: Mat2d): string => {
    return JSON.stringify(extraMat2dMethods.toComponents(xf));
  },

  decompose(xf: ReadonlyMat2d): {
    translation: vec2;
    scale: vec2;
    rotation: number;
  } {
    function dropZ(v3: vec3): vec2 {
      return vec2.fromValues(v3[0], v3[1]);
    }

    const asMat4 = extraMat2dMethods.toMat4(xf);
    const translation3 = mat4.getTranslation(vec3.create(), asMat4);
    const scale3 = mat4.getScaling(vec3.create(), asMat4);
    const rotQuat = mat4.getRotation(quat.create(), asMat4);

    // this seems to work
    const axis = vec3.create();
    const angle = quat.getAxisAngle(axis, rotQuat);
    const rotation = axis[2] * angle;

    return {
      translation: dropZ(translation3),
      scale: dropZ(scale3),
      rotation,
    };
  },

  compose(
    out: Mat2d,
    components: { translation: vec2; scale: vec2; rotation: number }
  ): Mat2d {
    mat2d.identity(out);
    mat2d.translate(out, out, components.translation);
    mat2d.rotate(out, out, components.rotation);
    mat2d.scale(out, out, components.scale);
    return out;
  },
};

const enhancedMat2d: typeof mat2d & typeof extraMat2dMethods = Object.assign(
  {},
  mat2d,
  extraMat2dMethods
);

const extraMat4Methods = {
  byColumn4x4: (mat: ReadonlyMat4): Float32Array => Float32Array.from(mat),
};

const enhancedMat4: typeof mat4 & typeof extraMat4Methods = Object.assign(
  {},
  mat4,
  extraMat4Methods
);

export { enhancedVec2 as vec2, enhancedMat2d as mat2d, enhancedMat4 as mat4 };

export type Vec2 = vec2;
export type Mat2d = mat2d;
