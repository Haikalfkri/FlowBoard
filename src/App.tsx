import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import DashboardPage from "./pages/DashboardPage";
import EditorPage from "./pages/EditorPage";
import ExecutionsPage from "./pages/ExecutionsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="workflows/:id" element={<EditorPage />} />
          <Route path="executions" element={<ExecutionsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}