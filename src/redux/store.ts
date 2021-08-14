import { configureStore } from "@reduxjs/toolkit";
import * as actions from "./actions";
import reducer from "./reducer";

export default configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ["sprite", "undoBuffer"],
      },
    }),
  devTools: false,
});
