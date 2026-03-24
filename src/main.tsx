
import { createRoot } from "react-dom/client";
import  App  from "./App";
import { StyledEngineProvider } from "@mui/material/styles";
const elem = document.getElementById("root")!;
const app = (
  <StyledEngineProvider injectFirst>
    <App />
  </StyledEngineProvider>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
