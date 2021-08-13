import * as React from 'react';
import { createReducer, createAction } from '@reduxjs/toolkit';
import Palette from './components/Palette';
import Artboard from './components/Artboard';
import Toolbar from './components/Toolbar';
import * as M from './model';

// function absurd<T>(x: never): T {
//   throw new Error(`Unexpected case: ${x}`);
// }

const changeTool = createAction<{tool: M.Tool}>('changeTool');

interface State {
  activeTool: M.Tool;
}

const initialState: State = {
  activeTool: 'pen',
};

const reducer = createReducer(initialState, (builder) => (
  builder
    .addCase(changeTool, (state, action) => {
      state.activeTool = action.payload.tool;
    })
));


function App() {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return (
    <div className="App">
      <Toolbar 
        activeTool={state.activeTool}
        onSelectTool={(tool) => {
          dispatch(changeTool({ tool }));
        }}
      />
      <Palette />
      <Artboard />
    </div>
  );
}

export default App;
