import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { AnalyseNomsPage } from "./pages/AnalyseNomsPage";
import { AnalyseProfessionsPage } from "./pages/AnalyseProfessionsPage";
import { AnalyseStatsPage } from "./pages/AnalyseStatsPage";
import { AProposPage } from "./pages/AProposPage";
import { ASavoirPage } from "./pages/ASavoirPage";
import { DirigeantsPage } from "./pages/DirigeantsPage";
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
  if (last === "parametres" || last === "aide-parametres") {
    return <Navigate to="/aide/parametres" replace />;
  }
  if (last === "warnings" || last === "aide-warnings") {
    return <Navigate to="/aide/warnings" replace />;
  }
  if (last === "histoire-faits" || last === "faits-historiques") {
    return <Navigate to="/histoire/faits" replace />;
  }
  if (last === "histoire-dirigeants") {
    return <Navigate to="/histoire/dirigeants" replace />;
  }
  if (last === "geoloc") return <Navigate to="/geoloc" replace />;
  if (last === "analyse-stats") return <Navigate to="/analyse/stats" replace />;
  if (last === "analyse-professions") return <Navigate to="/analyse/professions" replace />;
  if (last === "analyse-noms") return <Navigate to="/analyse/noms" replace />;
  if (last === "a-savoir" || last === "aide-a-savoir") {
    return <Navigate to="/aide/a-savoir" replace />;
  }
  if (last === "aide-a-propos") return <Navigate to="/aide/a-propos" replace />;
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
            <Route path="aide/a-propos" element={<AProposPage />} />
            <Route path="aide/warnings" element={<WarningsPage />} />
            <Route path="aide/a-savoir" element={<ASavoirPage />} />
            <Route path="aide/parametres" element={<SettingsPage />} />
            <Route path="parametres" element={<Navigate to="/aide/parametres" replace />} />
            <Route path="warnings" element={<Navigate to="/aide/warnings" replace />} />
            <Route path="histoire/faits" element={<FaitsHistoriquesPage />} />
            <Route path="histoire/dirigeants" element={<DirigeantsPage />} />
            <Route path="faits-historiques" element={<Navigate to="/histoire/faits" replace />} />
            <Route path="geoloc" element={<GeolocPage />} />
            <Route path="analyse/stats" element={<AnalyseStatsPage />} />
            <Route path="analyse/professions" element={<AnalyseProfessionsPage />} />
            <Route path="analyse/noms" element={<AnalyseNomsPage />} />
            <Route path="a-savoir" element={<Navigate to="/aide/a-savoir" replace />} />
            <Route path="*" element={<Navigate to="/recherche" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
