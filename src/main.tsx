import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";
import App from "./App.tsx";
import { PageSwipeProvider } from "./components/page-swipe.tsx";
import { LandingPage } from "./pages/landing.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/rawgrid-client">
      <PageSwipeProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/tools" element={<App />} />
        </Routes>
      </PageSwipeProvider>
    </BrowserRouter>
  </StrictMode>,
);
