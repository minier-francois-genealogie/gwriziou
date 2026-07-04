import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TreePage } from "./pages/TreePage";
import { WarningsPage } from "./pages/WarningsPage";
import { loadDerniereVue } from "./utils/appStorage";

function LastViewRedirect() {
  const last = loadDerniereVue();
  if (last === "arbre") return <Navigate to="/arbre" replace />;
  if (last === "parametres") return <Navigate to="/parametres" replace />;
  if (last === "warnings") return <Navigate to="/warnings" replace />;
  return <Navigate to="/recherche" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<LastViewRedirect />} />
            <Route path="recherche" element={<SearchPage />} />
            <Route path="arbre" element={<TreePage />} />
            <Route path="tree" element={<Navigate to="/arbre" replace />} />
            <Route path="parametres" element={<SettingsPage />} />
            <Route path="warnings" element={<WarningsPage />} />
            <Route path="*" element={<Navigate to="/recherche" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
