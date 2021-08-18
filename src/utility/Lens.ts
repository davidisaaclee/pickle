export interface Lens<Base, Focus> {
  get(b: Base): Focus;
  set(b: Base, v: Focus): Base;
  update(base: Base, update: (f: Focus) => Focus): Base;
}

type LensPropsConstructor<Base> = (<P1 extends keyof Base>(
  p1: P1
) => Lens<Base, Base[P1]>) &
  (<P1 extends keyof Base, P2 extends keyof Base[P1]>(
    p1: P1,
    p2: P2
  ) => Lens<Base, Base[P1][P2]>) &
  (<
    P1 extends keyof Base,
    P2 extends keyof Base[P1],
    P3 extends keyof Base[P1][P2]
  >(
    p1: P1,
    p2: P2,
    p3: P3
  ) => Lens<Base, Base[P1][P2][P3]>) &
  (<
    P1 extends keyof Base,
    P2 extends keyof Base[P1],
    P3 extends keyof Base[P1][P2],
    P4 extends keyof Base[P1][P2][P3]
  >(
    p1: P1,
    p2: P2,
    p3: P3,
    p4: P4
  ) => Lens<Base, Base[P1][P2][P3][P4]>);

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Lens = {
  from<Base>() {
    return {
      prop: ((...props: any[]): any => {
        if (props.length === 0) {
          throw new Error();
        }
        return mkLens({
          get(b: Base) {
            return props.reduce((acc, prop) => acc[prop], b);
          },
          set(b: Base, v: any) {
            props
              .slice(0, props.length - 1)
              .reduce((acc, prop) => acc[prop], b)[props[props.length - 1]] = v;
            return b;
          },
        });
      }) as LensPropsConstructor<Base>,
    };
  },
  of: mkLens,
};

function mkLens<Base, Focus>(spec: {
  get: (base: Base) => Focus;
  set: (base: Base, value: Focus) => Base;
}): Lens<Base, Focus> {
  return {
    set: spec.set,
    get: spec.get,
    update(base: Base, update: (f: Focus) => Focus): Base {
      return spec.set(base, update(spec.get(base)));
    },
  };
}
