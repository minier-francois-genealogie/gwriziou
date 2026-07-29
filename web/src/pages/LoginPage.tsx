import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "request";

const inputClass =
  "rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400";

export function LoginPage() {
  const { login, user } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [reqEmail, setReqEmail] = useState("");
  const [reqNom, setReqNom] = useState("");
  const [reqPrenom, setReqPrenom] = useState("");
  const [reqPassword, setReqPassword] = useState("");
  const [reqPassword2, setReqPassword2] = useState("");
  const [reqError, setReqError] = useState<string | null>(null);
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    "/";

  if (user) {
    return <Navigate to={from} replace />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setReqError(null);
    setReqSuccess(null);
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible");
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqSubmitting(true);
    setReqError(null);
    setReqSuccess(null);

    if (reqPassword !== reqPassword2) {
      setReqError("Les mots de passe ne correspondent pas");
      setReqSubmitting(false);
      return;
    }
    if (reqPassword.length < 8) {
      setReqError("Le mot de passe doit contenir au moins 8 caractères");
      setReqSubmitting(false);
      return;
    }

    try {
      const result = await api.authRequestAccount({
        email: reqEmail.trim(),
        nom: reqNom.trim(),
        prenom: reqPrenom.trim(),
        password: reqPassword,
      });
      setReqSuccess(result.message);
      setReqPassword("");
      setReqPassword2("");
    } catch (err) {
      setReqError(
        err instanceof ApiError ? err.message : "Envoi de la demande impossible",
      );
    } finally {
      setReqSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/icon-192.png" alt="Gwriziou" className="h-16 w-16 rounded-2xl" />
          <h1 className="text-xl font-bold text-sky-900">Gwriziou</h1>
          <p className="text-center text-sm text-slate-600">
            {mode === "login"
              ? "Connectez-vous pour accéder à l'application."
              : "Demandez la création d'un compte. Un administrateur validera la demande."}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              mode === "login"
                ? "bg-white text-sky-900 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => switchMode("request")}
            className={`rounded-md px-3 py-1.5 font-medium ${
              mode === "request"
                ? "bg-white text-sky-900 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Créer un compte
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={(e) => void onLogin(e)} className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </label>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {submitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void onRequestAccount(e)} className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={reqEmail}
                onChange={(e) => setReqEmail(e.target.value)}
                autoComplete="email"
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Nom</span>
              <input
                type="text"
                value={reqNom}
                onChange={(e) => setReqNom(e.target.value)}
                autoComplete="family-name"
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Prénom</span>
              <input
                type="text"
                value={reqPrenom}
                onChange={(e) => setReqPrenom(e.target.value)}
                autoComplete="given-name"
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Mot de passe</span>
              <input
                type="password"
                value={reqPassword}
                onChange={(e) => setReqPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">
                Confirmation du mot de passe
              </span>
              <input
                type="password"
                value={reqPassword2}
                onChange={(e) => setReqPassword2(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
              />
            </label>
            <p className="text-xs text-slate-500">
              Rôle attribué : <span className="font-medium text-slate-700">user</span> ·
              compte activé après validation.
            </p>
            {reqError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {reqError}
              </p>
            )}
            {reqSuccess && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {reqSuccess}
              </p>
            )}
            <button
              type="submit"
              disabled={reqSubmitting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {reqSubmitting ? "Envoi…" : "Envoyer la demande"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
