import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { AnalyseNomsPage } from "./pages/AnalyseNomsPage";
import { AnalyseProfessionsPage } from "./pages/AnalyseProfessionsPage";
import { AnalyseStatsPage } from "./pages/AnalyseStatsPage";
import { AProposPage } from "./pages/AProposPage";
import { ASavoirPage } from "./pages/ASavoirPage";
import { DirigeantsPage } from "./pages/DirigeantsPage";
import { FaitsHistoriquesPage } from "./pages/FaitsHistoriquesPage";
import { GeolocPage } from "./pages/GeolocPage";
import { GestionComptesPage } from "./pages/GestionComptesPage";
import { GestionNotesPage } from "./pages/GestionNotesPage";
import { GestionProfessionsPage } from "./pages/GestionProfessionsPage";
import { LoginPage } from "./pages/LoginPage";
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
  if (last === "warnings" || last === "aide-warnings" || last === "gestion-warnings") {
    return <Navigate to="/gestion/warnings" replace />;
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
  if (last === "gestion-professions") return <Navigate to="/gestion/professions" replace />;
  if (last === "admin-comptes") return <Navigate to="/admin/comptes" replace />;
  if (last === "gestion-notes") {
    return <Navigate to="/gestion/notes" replace />;
  }
  if (last === "a-savoir" || last === "aide-a-savoir") {
    return <Navigate to="/aide/a-savoir" replace />;
  }
  if (last === "aide-a-propos") return <Navigate to="/aide/a-propos" replace />;
  return <Navigate to="/recherche" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route
              element={
                <AppProvider>
                  <Layout />
                </AppProvider>
              }
            >
              <Route index element={<LastViewRedirect />} />
              <Route path="recherche" element={<SearchPage />} />
              <Route path="arbre" element={<TreePage />} />
              <Route path="tree" element={<Navigate to="/arbre" replace />} />
              <Route path="aide/a-propos" element={<AProposPage />} />
              <Route path="aide/warnings" element={<Navigate to="/gestion/warnings" replace />} />
              <Route element={<RequireAdmin />}>
                <Route path="gestion/professions" element={<GestionProfessionsPage />} />
                <Route path="gestion/warnings" element={<WarningsPage />} />
                <Route path="gestion/notes" element={<GestionNotesPage />} />
                <Route path="admin/comptes" element={<GestionComptesPage />} />
              </Route>
              <Route path="admin/notes" element={<Navigate to="/gestion/notes" replace />} />
              <Route path="admin/remarques" element={<Navigate to="/gestion/notes" replace />} />
              <Route path="aide/a-savoir" element={<ASavoirPage />} />
              <Route path="aide/parametres" element={<SettingsPage />} />
              <Route path="parametres" element={<Navigate to="/aide/parametres" replace />} />
              <Route path="warnings" element={<Navigate to="/gestion/warnings" replace />} />
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
