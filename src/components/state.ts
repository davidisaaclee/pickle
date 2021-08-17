import * as M from "../model";

export interface HistoryItem {
  animation: M.Animation;
  playback: M.AnimationPlayback;
}

export interface State {
  history: {
    past: Array<HistoryItem>;
    present: HistoryItem;
    future: Array<HistoryItem>;
  };
  activeTool: M.Tool;
  activeColor: M.PixelContent;
}
