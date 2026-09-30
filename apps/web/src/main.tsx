import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import "./app/globals.css";
import "katex/dist/katex.min.css";
import "@fontsource/alegreya-sans/latin-400.css";
import "@fontsource/alegreya-sans/latin-700.css";
import "@fontsource/alegreya-sans/latin-900.css";
import "@fontsource/caveat/latin-600.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><React.Suspense fallback={<p className="p-6" role="status">Memuat halaman...</p>}><RouterProvider router={router} /></React.Suspense></React.StrictMode>);
