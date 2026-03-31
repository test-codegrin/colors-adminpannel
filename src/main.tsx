import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@heroui/react";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { Provider } from "./provider";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <BrowserRouter>
    <Provider>
      <ToastProvider placement="bottom-right" />

      <AuthProvider>
        <App />
      </AuthProvider>
    </Provider>
  </BrowserRouter>,
  // </React.StrictMode>,
);
