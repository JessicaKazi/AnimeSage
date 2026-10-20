
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AuthPanel({ token, user, onAuthSuccess, onLogout }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { username, email, password }
            : { email, password }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onAuthSuccess(data.token, data.user);
      setPassword("");
      setOpen(false);
    } catch (err) {
      setError(err.message || "Unable to connect to AnimeSage.");
    } finally {
      setBusy(false);
    }
  }

  if (token && user) {
    return (
      <div className="account-area">
        <span className="account-name">Signed in as <strong>{user.username}</strong></span>
        <button className="account-button" onClick={onLogout}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="auth-area">
      <button className="account-button" onClick={() => setOpen(!open)}>
        Sign in
      </button>

      {open && (
        <div className="auth-popover">
          <button className="auth-close" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>

          <span className="section-kicker">ANIMESAGE ACCOUNT</span>
          <h2>{mode === "register" ? "Join AnimeSage" : "Welcome back"}</h2>
          <p className="auth-description">
            {mode === "register"
              ? "Create an account to keep your anime collection."
              : "Sign in to access your saved anime."}
          </p>

          <form onSubmit={submit} className="auth-form">
            {mode === "register" && (
              <label>
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]+"
                  autoComplete="username"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="primary-button auth-submit" disabled={busy}>
              {busy ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "register" ? "Already have an account?" : "New to AnimeSage?"}
            {" "}
            <button
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
              }}
            >
              {mode === "register" ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
