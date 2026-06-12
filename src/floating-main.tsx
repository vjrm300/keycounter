import React from "react";
import ReactDOM from "react-dom/client";
import FloatingBall from "./components/FloatingBall";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("缺少 #root 元素");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FloatingBall />
    </ErrorBoundary>
  </React.StrictMode>,
);