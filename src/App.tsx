import { useAuth } from "./auth/AuthContext";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { MustChangePasswordScreen } from "./screens/MustChangePasswordScreen";

export default function App() {
  const { loading, isAuthenticated, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <div className="screen center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (mustChangePassword) {
    return <MustChangePasswordScreen />;
  }

  return <HomeScreen />;
}
