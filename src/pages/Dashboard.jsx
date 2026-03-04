import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { clearMonster, getMonster } from "../storage";
import { clp } from "../helpers";

export default function Dashboard() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState({ owe: 0, owed: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true); setErr("");
      const monsterCode = getMonster();
      if (!monsterCode) { nav("/"); return; }
      const { data: meData, error: meErr } = await supabase
        .from("monsters").select("id, code, display_name")
        .eq("code", monsterCode).single();
      if (meErr || !meData) { setErr(meErr?.message || "Error"); setLoading(false); return; }
      if (cancelled) return;
      setMe(meData);
      const [{ data: oweRows }, { data: owedRows }] = await Promise.all([
        supabase.from("payments").select("amount").eq("from_monster_id", meData.id).eq("status", "pending"),
        supabase.from("payments").select("amount").eq("to_monster_id", meData.id).eq("status", "pending"),
      ]);
      if (cancelled) return;
      setStats({
        owe:  (oweRows  || []).reduce((s, r) => s + r.amount, 0),
        owed: (owedRows || []).reduce((s, r) => s + r.amount, 0),
      });
      setLoading(false);
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [nav]);

  const net = stats.owed - stats.owe;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--cyan)", opacity: 0.7, letterSpacing: 3, textTransform: "uppercase", fontSize: 13 }}>
        Cargando...
      </div>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 28, paddingTop: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--cyan)", opacity: 0.7, marginBottom: 4 }}>
          Monster activo
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1 }}>{me?.display_name}</div>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      {/* Stats */}
      <div className="grid grid2" style={{ marginBottom: 12 }}>
        <div className="card" style={{ borderColor: stats.owe > 0 ? "#5a2000" : "var(--border)" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: stats.owe > 0 ? "#ff9800" : "var(--muted)", marginBottom: 6 }}>
            Debés
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: stats.owe > 0 ? "#ff9800" : "var(--text)" }}>
            ${clp(stats.owe)}
          </div>
        </div>
        <div className="card" style={{ borderColor: stats.owed > 0 ? "#005a30" : "var(--border)" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: stats.owed > 0 ? "#00d4a0" : "var(--muted)", marginBottom: 6 }}>
            Te deben
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: stats.owed > 0 ? "#00d4a0" : "var(--text)" }}>
            ${clp(stats.owed)}
          </div>
        </div>
      </div>

      {/* Balance neto */}
      <div className="card" style={{
        marginBottom: 24,
        borderColor: net > 0 ? "#005a30" : net < 0 ? "#5a2000" : "var(--border)",
        background: net > 0 ? "#001a0a" : net < 0 ? "#1a0800" : "var(--bg2)",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
          Balance neto
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: net > 0 ? "#00d4a0" : net < 0 ? "#ff9800" : "var(--text)" }}>
          {net >= 0 ? "+" : ""}{net < 0 ? "-" : ""}${clp(Math.abs(net))}
        </div>
        <div className="muted" style={{ marginTop: 4 }}>Solo referencia · la operación es por gasto</div>
      </div>

      {/* Nav */}
      <div className="grid grid2">
        <Link className="btn" to="/add">+ Agregar gasto</Link>
        <Link className="btn" to="/pending">⏳ Pagos pendientes</Link>
        <Link className="btn" to="/receivables">💰 Cobros</Link>
        <Link className="btn" to="/expenses">📋 Todos los gastos</Link>
      </div>
    </div>
  );
}