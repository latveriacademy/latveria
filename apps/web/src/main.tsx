import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import "./app/globals.css";
import "./latveria-os.css";
import "./lib/motion/motion.css";
import "katex/dist/katex.min.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense
      fallback={
        <p className="p-6 text-[var(--soft-ink)]" role="status">
          Memuat halaman...
        </p>
      }
    >
      <RouterProvider router={router} />
    </React.Suspense>
  </React.StrictMode>,
);
