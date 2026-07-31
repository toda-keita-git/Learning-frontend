import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Home from "./Home";
import { AuthProvider } from "./Context";

// xlsx/react-syntax-highlighter/@octokit/rest など重い依存を含む画面は、
// 初回表示（Home）のバンドルから切り離すために遅延読み込みする
const FileSearch = lazy(() => import("./FileSearch"));
const LearningContent = lazy(() => import("./LearningContent"));
const GuestLearningContent = lazy(() => import("./GuestLearningContent"));
const PageNotFound = lazy(() => import("./PageNotFound"));

const RouteFallback = () => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <CircularProgress />
  </Box>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/FileSearch" element={<FileSearch />} />
          <Route path="/guest" element={<GuestLearningContent />} />
          <Route
            path="/LearningContent"
            element={
              <AuthProvider>
                <LearningContent />
              </AuthProvider>
            }
          />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
