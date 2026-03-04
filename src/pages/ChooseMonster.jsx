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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 700 }}>

        <h1 style={{
          textAlign: "center",
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 24,
          color: "#fff",
          fontFamily: "'Metal Mania', cursive",
        }}>
          Choose Your Monster
        </h1>

        {err && <p style={{ color: "salmon", textAlign: "center" }}>{err}</p>}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}>
          {monsters.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMonster(m.code); nav("/dashboard"); }}
              style={{
                position: "relative",
                height: 200,
                borderRadius: 14,
                border: "none",
                overflow: "hidden",
                cursor: "pointer",
                background: "#141422",
                padding: 0,
              }}
            >
              {m.avatar_url && (
                <img
                  src={m.avatar_url}
                  alt={m.display_name}
                  style={{
                    position: "absolute",
                    top: "-10%",       /* sube la imagen para centrar las caras */
                    left: "-5%",
                    width: "115%",     /* zoom leve para tapar bordes blancos */
                    height: "115%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                />
              )}
              {/* Overlay degradé */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.15) 70%)",
              }} />
              {/* Nombre */}
              <div style={{
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                padding: "12px 10px",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                textAlign: "center",
                letterSpacing: 1,
                textTransform: "uppercase",
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