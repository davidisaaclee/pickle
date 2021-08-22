import * as React from "react";

type GesturePhase = "possible" | "active";

type BindHandlers<E> = () => Partial<
  Pick<
    React.DOMAttributes<E>,
    "onPointerDown" | "onPointerMove" | "onPointerUp"
  >
>;

type CombineFunctionRecords = <K extends string, A>(
  a: Partial<Record<K, (a0: A) => void>>,
  b: Partial<Record<K, (a0: A) => void>>
) => Partial<Record<K, (a0: A) => void>>;
const combineFunctionRecords: CombineFunctionRecords = (a: any, b: any) => {
  const out: Partial<Record<any, any>> = {};
  const allKeys = new Set(Object.keys(a));
  Object.keys(b).forEach((k) => allKeys.add(k));
  allKeys.forEach((key: any) => {
    out[key] = (...args: any[]) => {
      if (a[key] != null) {
        a[key](...args);
      }
      if (b[key] != null) {
        b[key](...args);
      }
    };
  });
  return out;
};

export function combineBindHandlers<T>(
  bindHandlersList: BindHandlers<T>[]
): BindHandlers<T> {
  return () => {
    let out: ReturnType<BindHandlers<T>> = {};

    for (const bh of bindHandlersList) {
      out = combineFunctionRecords(bh(), out);
    }

    return out;
  };
}

interface MakeGestureHookOptions<InternalState, ExternalState> {
  initialState(): InternalState;
  onPointerEvent(args: {
    internalState: InternalState;
    event: React.PointerEvent;
    eventType: "pointerdown" | "pointermove" | "pointerup";
  }): InternalState | null;
  externalStateFromInternalState(
    internalState: InternalState
  ): [GesturePhase, ExternalState];
}

type GestureHook<State, E = Element> = (args: {
  onGestureStateChange: (phase: GesturePhase, state: State) => void;
}) => {
  bindHandlers: BindHandlers<E>;
};

/** e.g. `OnGestureStateChange<typeof useMultiFingerPan>` */
export type OnGestureStateChange<GestureHookType> =
  GestureHookType extends GestureHook<infer State, any>
    ? (phase: GesturePhase, state: State) => void
    : never;

export default function makeGestureHook<
  InternalState,
  ExternalState,
  E extends Element = Element
>({
  initialState: makeInitialState,
  onPointerEvent,
  externalStateFromInternalState,
}: MakeGestureHookOptions<InternalState, ExternalState>): GestureHook<
  ExternalState,
  E
> {
  return function useRef({ onGestureStateChange }) {
    const internalStateRef = React.useRef(makeInitialState());

    const applyStateUpdate = React.useCallback(
      (nextState: InternalState | null) => {
        if (nextState == null) {
          return;
        }
        internalStateRef.current = nextState;
        const [phase, extState] = externalStateFromInternalState(nextState);
        onGestureStateChange(phase, extState);
      },
      [onGestureStateChange]
    );

    return {
      bindHandlers: () => {
        return {
          onPointerDown(event) {
            applyStateUpdate(
              onPointerEvent({
                internalState: internalStateRef.current,
                event,
                eventType: "pointerdown",
              })
            );
          },
          onPointerUp(event) {
            applyStateUpdate(
              onPointerEvent({
                internalState: internalStateRef.current,
                event,
                eventType: "pointerup",
              })
            );
          },
          onPointerMove(event) {
            applyStateUpdate(
              onPointerEvent({
                internalState: internalStateRef.current,
                event,
                eventType: "pointermove",
              })
            );
          },
        };
      },
    };
  };
}

type MultiFingerPanState<E> = {
  pointers: {
    [pointerId: string]: { position: [number, number]; currentTarget: E };
  };
};
export const useMultiFingerPan = makeGestureHook<
  MultiFingerPanState<Element>,
  MultiFingerPanState<Element>,
  Element
>({
  initialState() {
    return {
      pointers: {},
    };
  },
  onPointerEvent({
    event,
    eventType,
    internalState,
  }): MultiFingerPanState<Element> | null {
    switch (eventType) {
      case "pointerdown":
        return {
          ...internalState,
          pointers: {
            ...internalState.pointers,
            [event.pointerId]: {
              position: [event.clientX, event.clientY],
              currentTarget: event.currentTarget,
            },
          },
        };

      case "pointermove":
        if (internalState.pointers[event.pointerId] == null) {
          return null;
        }

        return {
          ...internalState,
          pointers: {
            ...internalState.pointers,
            [event.pointerId]: {
              position: [event.clientX, event.clientY],
              currentTarget: event.currentTarget,
            },
          },
        };

      case "pointerup":
        if (internalState.pointers[event.pointerId] == null) {
          return null;
        }
        const pointers = { ...internalState.pointers };
        delete pointers[event.pointerId];
        return { ...internalState, pointers };

      default:
        return null;
    }
  },
  externalStateFromInternalState(internalState) {
    return [
      Object.keys(internalState.pointers).length > 0 ? "active" : "possible",
      internalState,
    ];
  },
});

export const useDoubleTapGesture = makeGestureHook<
  {
    recentTaps: Array<{ isDown: boolean; pointerId: number; timestamp: Date }>;
    becameActiveAt: Date | null;
  },
  { becameActiveAt: Date | null }
>({
  initialState() {
    return {
      recentTaps: [],
      becameActiveAt: null,
    };
  },
  onPointerEvent({ internalState, event, eventType }) {
    if (!["pointerup", "pointerdown"].includes(eventType)) {
      return null;
    }

    const recentTaps = internalState.recentTaps.filter(
      (e) => +e.timestamp - Date.now() < 1000
    );

    if (eventType === "pointerdown") {
      recentTaps.unshift({
        isDown: true,
        pointerId: event.pointerId,
        timestamp: new Date(),
      });
    } else if (eventType === "pointerup") {
      recentTaps.unshift({
        isDown: false,
        pointerId: event.pointerId,
        timestamp: new Date(),
      });
    }

    // determine if a double tap happened

    const becameActiveAt = (() => {
      const maxTapDuration = 200;
      const maxTimeBetweenTaps = 300;

      if (recentTaps.length < 4) {
        return null;
      }
      const [a, b, c, d] = recentTaps.slice(0, 4);
      const isDoubleTap = !a.isDown && b.isDown && !c.isDown && d.isDown;

      const areTapsTooLong =
        +a.timestamp - +b.timestamp > maxTapDuration ||
        +c.timestamp - +d.timestamp > maxTapDuration;

      const areTapsTooFarApart =
        +b.timestamp - +c.timestamp > maxTimeBetweenTaps;

      if (!isDoubleTap || areTapsTooLong || areTapsTooFarApart) {
        return null;
      }

      return d.timestamp;
    })();

    if (becameActiveAt != null) {
      recentTaps.splice(0, recentTaps.length);
    }

    return { recentTaps, becameActiveAt };
  },
  externalStateFromInternalState({ becameActiveAt }) {
    return [becameActiveAt == null ? "possible" : "active", { becameActiveAt }];
  },
});

// import makeGestureHook from "../utility/useGesture";

// type MultiFingerPanState = {
//   pointers: { [pointerId: string]: { position: [number, number] } };
// };
// const useMultiFingerPan = makeGestureHook<
//   MultiFingerPanState,
//   MultiFingerPanState
// >({
//   initialState() {
//     return {
//       pointers: {},
//     };
//   },
//   onPointerEvent({
//     event,
//     eventType,
//     internalState,
//   }): MultiFingerPanState | null {
//     switch (eventType) {
//       case "pointerdown":
//         return {
//           ...internalState,
//           pointers: {
//             ...internalState.pointers,
//             [event.pointerId]: { position: [event.clientX, event.clientY] },
//           },
//         };

//       case "pointermove":
//         if (internalState.pointers[event.pointerId] == null) {
//           return null;
//         }

//         return {
//           ...internalState,
//           pointers: {
//             ...internalState.pointers,
//             [event.pointerId]: {
//               position: [event.clientX, event.clientY],
//             },
//           },
//         };

//       case "pointerup":
//         if (internalState.pointers[event.pointerId] == null) {
//           return null;
//         }
//         const pointers = { ...internalState.pointers };
//         delete pointers[event.pointerId];
//         return { ...internalState, pointers };

//       default:
//         return null;
//     }
//   },
//   externalStateFromInternalState(internalState) {
//     return [
//       Object.keys(internalState.pointers).length > 0 ? "active" : "possible",
//       internalState,
//     ];
//   },
// });

// const useSingleFingerPan = makeGestureHook<
//   { position: [number, number] | null },
//   { position: [number, number] | null }
// >({
//   initialState() {
//     return { position: null };
//   },
//   onPointerEvent({ event, eventType, internalState }) {
//     switch (eventType) {
//       case "pointerdown":
//         return { position: [event.clientX, event.clientY] };

//       case "pointermove":
//         if (internalState.position == null) {
//           return null;
//         }
//         return { position: [event.clientX, event.clientY] };

//       case "pointerup":
//         if (internalState.position == null) {
//           return null;
//         }
//         return { position: null };

//       default:
//         return null;
//     }
//   },
//   externalStateFromInternalState(internalState) {
//     return [
//       internalState.position == null ? "possible" : "active",
//       internalState,
//     ];
//   },
// });

// export function TestComponent() {
//   const [message, setMessage] = React.useState("waiting");
//   const { bindHandlers } = useMultiFingerPan({
//     onGestureStateChange(phase, state) {
//       if (phase === "active") {
//         setMessage(
//           JSON.stringify(
//             Object.keys(state.pointers).map((k) => state.pointers[k].position)
//           )
//         );
//       } else {
//         setMessage("waiting");
//       }
//     },
//   });

//   return (
//     <div
//       style={{
//         touchAction: "none",
//         width: 500,
//         height: 500,
//         backgroundColor: "orange",
//       }}
//       {...bindHandlers()}
//     >
//       {message}
//     </div>
//   );
// }
