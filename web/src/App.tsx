import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { ASavoirPage } from "./pages/ASavoirPage";
import { FaitsHistoriquesPage } from "./pages/FaitsHistoriquesPage";
import { GeolocPage } from "./pages/GeolocPage";
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
  if (last === "faits-historiques") return <Navigate to="/faits-historiques" replace />;
  if (last === "geoloc") return <Navigate to="/geoloc" replace />;
  if (last === "a-savoir") return <Navigate to="/a-savoir" replace />;
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
            <Route path="faits-historiques" element={<FaitsHistoriquesPage />} />
            <Route path="geoloc" element={<GeolocPage />} />
            <Route path="a-savoir" element={<ASavoirPage />} />
            <Route path="*" element={<Navigate to="/recherche" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
