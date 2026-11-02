import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./store/ThemeContext.tsx";
import { AuthProvider } from "./store/AuthContext.tsx";
import { RbacProvider } from "./store/RbacContext.tsx";
import { DataProvider } from "./store/DataStore.tsx";
import { NotificationProvider } from "./store/NotificationStore.tsx";
import { PlatformProvider } from "./store/PlatformStore.tsx";

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename || undefined}>
      <ThemeProvider>
        <RbacProvider>
          <AuthProvider>
            <NotificationProvider>
              <PlatformProvider>
                <DataProvider>
                  <App />
                </DataProvider>
              </PlatformProvider>
            </NotificationProvider>
          </AuthProvider>
        </RbacProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
