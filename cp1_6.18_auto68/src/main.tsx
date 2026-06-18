import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { JournalProvider } from "./context/JournalContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <JournalProvider>
      <App />
    </JournalProvider>
  </React.StrictMode>
);
