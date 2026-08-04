import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

// ページ遷移のたびに、body/htmlに残った可能性のあるスクロールロック用の
// インラインスタイルを念のため解除する。LearningContent（チャットUI）は
// iOS対策でbody position:fixed等を使っており、通常は自分でクリーンアップ
// するが、スマホのドロワーを開いたまま「ホーム」で離脱した場合など、
// MUIのモーダル管理と競合してロックが残ってしまうケースへの保険
function ScrollUnlockOnNavigate() {
  const location = useLocation();

  useEffect(() => {
    const { body, documentElement: html } = document;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overflow = "";
    html.style.overflow = "";
    body.style.overscrollBehaviorY = "";
    html.style.overscrollBehaviorY = "";
  }, [location.pathname]);

  return null;
}

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
      <ScrollUnlockOnNavigate />
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
