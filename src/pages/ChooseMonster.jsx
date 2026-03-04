import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster, setMonster } from "../storage";

export default function ChooseMonster() {
  const nav = useNavigate();
  const [monsters, setMonsters] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const existing = getMonster();
    if (existing) nav("/dashboard");
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
        <h1 className="h1">Choose your Monster</h1>
        <div className="muted">Sin login: selecciona tu personaje para esta sesión.</div>
        {err && <p style={{ color: "salmon" }}>{err}</p>}
        <div className="hr" />
        <div className="grid grid3">
          {monsters.map((m) => (
            <button
              key={m.id}
              className="card btnSecondary"
              style={{
                textAlign: "left",
                minHeight: 90,
                backgroundImage: m.avatar_url ? `url(${m.avatar_url})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              onClick={() => {
                setMonster(m.code);
                nav("/dashboard");
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{m.display_name}</div>
              <div className="muted">{m.code}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}