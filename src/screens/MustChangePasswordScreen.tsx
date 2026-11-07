import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

function passwordChecks(value: string) {
  return {
    minLength: value.length >= 8,
    hasUpper: /[A-Z]/.test(value),
    hasLower: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  };
}

export function MustChangePasswordScreen() {
  const { completeMustChange, logout, email } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checks = useMemo(() => passwordChecks(newPassword), [newPassword]);
  const valid = Object.values(checks).every(Boolean);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!valid) {
      setError("Use 8+ characters with upper, lower, number, and symbol");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await completeMustChange(newPassword);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : "Could not set password");
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen center">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>Set new password</h1>
        <p className="muted">
          {email ? `${email} — ` : ""}
          You must set a new password before continuing.
        </p>

        <label className="field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button
          type="submit"
          className="btn primary"
          disabled={busy || !valid}
        >
          {busy ? "Saving…" : "Save password"}
        </button>

        <button
          type="button"
          className="btn"
          style={{ marginTop: 8 }}
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
