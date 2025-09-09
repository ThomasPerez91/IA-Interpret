import styles from "./App.module.css";
import { Routes, Route } from "react-router-dom";

import { Hero } from "./components/Hero/Hero";
import { Features } from "./components/Features/Features";

import { Login } from "./auth/Login";
import { Register } from "./auth/Register";
import { ProtectedRoute } from "./auth/ProtectedRoute";

import { Dashboard } from "./pages/Dashboard";
import { Datasets } from "./pages/Datasets";
import { Models } from "./pages/Models";
import { Analyses } from "./pages/Analyses";
import { CleaningPlan } from "./pages/CleaningPlan";

import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";

function Home() {
  return (
    <>
      <Hero />
      <Features />
    </>
  );
}

function App() {
  return (
    <div className={styles.app}>
      <main>
        <Routes>
          {/* Public */}
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Dashboard protégé */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="datasets" element={<Datasets />} />
            <Route path="models" element={<Models />} />
            <Route path="analyses" element={<Analyses />} />
            {/* ⬇️ Route ENFANT RELATIVE (pas de /dashboard en doublon) */}
            <Route path="datasets/:id/cleaning" element={<CleaningPlan />} />
          </Route>
        </Routes>
      </main>

      <footer className={styles.footer}>
        <p>
          © {new Date().getFullYear()} IA Interpret — Comprendre et exploiter
          vos données.
        </p>
      </footer>
    </div>
  );
}

export default App;
