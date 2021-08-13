import { useDispatch as useDispatch_untyped } from "react-redux";
import store from "./store";

export type Dispatch = typeof store.dispatch;
export const useDispatch = () => useDispatch_untyped<Dispatch>();
