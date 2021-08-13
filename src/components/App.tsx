import * as React from "react";
import classNames from "classnames";
import Artboard from "../components/Artboard";
import ArtboardInteractionHandler from "../components/ArtboardInteractionHandler";
import Toolbar from "../components/Toolbar";
import * as M from "../model";
import styles from "./App.module.css";
import { selectors, actions, useSelector, useDispatch } from "../redux";
import { ReadonlyVec2, mat2d, vec2 } from "../utility/gl-matrix";

const artboardClientSize = vec2.fromValues(500, 500);

const toMutableTuple = (v2: ReadonlyVec2): [number, number] => [
  vec2.x(v2),
  vec2.y(v2),
];

function App() {
  // const store = useStore();
  // React.useEffect(() => {
  //   store.subscribe(() => {
  //     console.log(store.getState().activeChange);
  //   });
  // }, [store]);

  const dispatch = useDispatch();
  const activeSprite = useSelector(selectors.activeSprite);
  const [activeTool, setActiveTool] = React.useState<M.Tool>("pen");

  /** if `v` is a client position, the following will give the artboard
   * coordinates:
   *     vec2.transformMat2d(v, v, artboardClientTransform) */
  const artboardClientTransform = React.useMemo(() => {
    const out = mat2d.create();
    mat2d.fromScaling(
      out,
      vec2.div(vec2.create(), activeSprite.size, artboardClientSize)
    );
    return out;
  }, [activeSprite.size]);

  return (
    <div className={classNames(styles.container)}>
      <Toolbar
        className={styles.toolbar}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onSelectUndo={() => dispatch(actions.undo())}
        onSelectRedo={() => {} /*dispatch(actions.redo()) */}
      />
      <ArtboardInteractionHandler
        onDown={(artboardPos) => {
          dispatch(
            actions.applyTool({
              phase: "down",
              locations: [artboardPos].map(toMutableTuple),
              tool: activeTool,
            })
          );
        }}
        onMove={(artboardPos) => {
          dispatch(
            actions.applyTool({
              phase: "move",
              locations: [artboardPos].map(toMutableTuple),
              tool: activeTool,
            })
          );
        }}
        onUp={(artboardPos) => {
          dispatch(actions.commitChange());
        }}
        artboardClientTransform={artboardClientTransform}
      >
        {(handlers) => (
          <Artboard
            {...handlers}
            className={classNames(styles.artboard)}
            style={{}}
            sprite={activeSprite}
            transform={artboardClientTransform}
          />
        )}
      </ArtboardInteractionHandler>
    </div>
  );
}

export default App;
