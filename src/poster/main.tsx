import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Poster } from "./Poster";

createRoot(document.getElementById("poster-root")!).render(
  <StrictMode>
    <Poster />
  </StrictMode>,
);
