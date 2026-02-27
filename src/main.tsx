import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";
import App from "./App.tsx";
import { LandingPage } from "./pages/landing.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/rawgrid-client">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tools" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
