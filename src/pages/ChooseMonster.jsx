import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster, setMonster } from "../storage";

export default function ChooseMonster() {
  const nav = useNavigate();
  const [monsters, setMonsters] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (getMonster()) nav("/dashboard");
  }, [nav]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("monsters")
        .select("id, code, display_name, avatar_url")
        .order("display_name", { ascending: true });
      if (error) setErr(error.message);
      else setMonsters(data || []);
    })();
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1" style={{ fontSize: 26, textAlign: "center", marginBottom: 4 }}>
          ¿Quién sos?
        </h1>
        <div className="muted" style={{ textAlign: "center", marginBottom: 16 }}>
          Seleccioná tu Monster para esta sesión
        </div>
        {err && <p style={{ color: "salmon" }}>{err}</p>}
        <div className="grid grid3">
          {monsters.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMonster(m.code); nav("/dashboard"); }}
              style={{
                position: "relative",
                minHeight: 140,
                borderRadius: 14,
                border: "1px solid #34346a",
                overflow: "hidden",
                cursor: "pointer",
                background: m.avatar_url ? "transparent" : "#141422",
                padding: 0,
              }}
            >
              {/* Foto de fondo */}
              {m.avatar_url && (
                <img
                  src={m.avatar_url}
                  alt={m.display_name}
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
              {/* Overlay degradé */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.1) 100%)",
              }} />
              {/* Nombre */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "12px 10px",
                color: "#fff",
                fontWeight: 800,
                fontSize: 16,
                textAlign: "center",
                letterSpacing: 0.5,
              }}>
                {m.display_name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}