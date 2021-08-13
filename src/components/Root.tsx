import { Provider } from "react-redux";
import store from "../redux/store";
import App from "./App";

export default function Root() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
