import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import FileSearch from "./FileSearch";
import PageNotFound from "./PageNotFound";
import LearningContent from "./LearningContent";
import { AuthProvider } from "./Context";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/FileSearch" element={<FileSearch />} />
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
    </BrowserRouter>
  );
}
