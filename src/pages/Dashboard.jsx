import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { clearMonster, getMonster } from "../storage";
import { clp } from "../helpers";

export default function Dashboard() {
  const nav = useNavigate();
  const monsterCode = getMonster();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState({ owe: 0, owed: 0 });
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: meData, error: meErr } = await supabase
        .from("monsters")
        .select("id, code, display_name")
        .eq("code", monsterCode)
        .single();
      if (meErr) return setErr(meErr.message);
      setMe(meData);

      const { data: oweRows, error: oweErr } = await supabase
        .from("payments")
        .select("amount")
        .eq("from_monster_id", meData.id)
        .eq("status", "pending");
      if (oweErr) return setErr(oweErr.message);

      const { data: owedRows, error: owedErr } = await supabase
        .from("payments")
        .select("amount")
        .eq("to_monster_id", meData.id)
        .eq("status", "pending");
      if (owedErr) return setErr(owedErr.message);

      const owe = (oweRows || []).reduce((s, r) => s + r.amount, 0);
      const owed = (owedRows || []).reduce((s, r) => s + r.amount, 0);
      setStats({ owe, owed });
    })();
  }, [monsterCode]);

  const net = useMemo(() => stats.owed - stats.owe, [stats]);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="muted">Logged as</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{me?.display_name || monsterCode}</div>
        </div>
        <button
          className="btn btnSecondary"
          onClick={() => {
            clearMonster();
            nav("/");
          }}
        >
          Switch Monster
        </button>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      <div className="grid grid2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="muted">Debes</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>${clp(stats.owe)}</div>
        </div>
        <div className="card">
          <div className="muted">Te deben</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>${clp(stats.owed)}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="muted">Balance neto</div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>
          {net >= 0 ? "+" : "-"}${clp(Math.abs(net))}
        </div>
        <div className="muted">
          (Solo referencia, la operación es por gasto.)
        </div>
      </div>

      <div className="grid grid2" style={{ marginTop: 12 }}>
        <Link className="btn" to="/add">Agregar gasto</Link>
        <Link className="btn" to="/pending">Pagos pendientes</Link>
        <Link className="btn" to="/receivables">Cobros</Link>
        <Link className="btn" to="/expenses">Todos los gastos</Link>
      </div>
    </div>
  );
}