import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./store/ThemeContext.tsx";
import { LocaleProvider } from "./store/LocaleContext.tsx";
import { AuthProvider } from "./store/AuthContext.tsx";
import { PlatformProvider } from "./store/PlatformStore.tsx";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename || undefined}>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <PlatformProvider>
              <App />
            </PlatformProvider>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
