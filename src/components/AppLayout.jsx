import { useNavigate, useLocation } from "react-router-dom";
import { getMonster, clearMonster } from "../storage";

export default function AppLayout({ children }) {
  const nav = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/";

  function handleSwitch() {
    clearMonster();
    nav("/");
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>

      {/* Textura de fondo */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "url('/drips_texture.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 0.18,
        pointerEvents: "none",
      }} />

      {/* Header sticky — solo en páginas internas */}
      {!isLogin && (
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(7,7,15,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <img
            src="/logo_white.png"
            alt="We Are The Monster"
            style={{ height: 36, cursor: "pointer", objectFit: "contain" }}
            onClick={() => nav("/dashboard")}
          />

          {/* Monster activo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase",
              color: "var(--cyan)", opacity: 0.8
            }}>
              {getMonster()}
            </div>
            <button
              className="btn btnSecondary"
              style={{ fontSize: 11, padding: "5px 12px" }}
              onClick={handleSwitch}
            >
              ⇄ Switch
            </button>
          </div>
        </header>
      )}

      {/* Contenido */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}