import { useAuth } from "./auth/AuthContext";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="screen center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return isAuthenticated ? <HomeScreen /> : <LoginScreen />;
}
