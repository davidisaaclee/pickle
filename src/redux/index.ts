import {
  TypedUseSelectorHook,
  useSelector as useSelector_untyped,
} from "react-redux";
import { State } from "./types";
import * as staticActions from "./actions";
import * as thunkActions from "./thunks";

export { useDispatch } from "./dispatch";
export type { Dispatch } from "./dispatch";
export * as selectors from "./selectors";
export const actions = { ...staticActions, ...thunkActions };
export type { State };
export const useSelector: TypedUseSelectorHook<State> = useSelector_untyped;
