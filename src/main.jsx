import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import "./index.css";
import App from "./App.jsx";
import UploadThing from "./UploadThing";
import { AppProvider } from "./AppContext.jsx";
import PaymentSuccess from "./PaymentSuccess.jsx";
import LoginBrowser from "./LoginBrowser.jsx";

const isElectron = window.location.protocol === "file:";

const Router = isElectron ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/payment" element={<PaymentSuccess />} />
          <Route path="/" element={<App />} />
          <Route path="/share/:id" element={<UploadThing />} />
          <Route path="/editor/:tool" element={<App />} />
          <Route path="/desktop-login" element={<LoginBrowser />} />
        </Routes>
      </Router>
    </AppProvider>
  </StrictMode>,
);