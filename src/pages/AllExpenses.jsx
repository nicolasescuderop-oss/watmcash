import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp } from "../helpers";

export default function AllExpenses() {
  const nav = useNavigate();
  const monsterCode = getMonster();
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const { data: meData, error: meErr } = await supabase
      .from("monsters")
      .select("id, display_name")
      .eq("code", monsterCode)
      .single();
    if (meErr) return setErr(meErr.message);
    setMe(meData);

    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id, description, expense_date, amount,
        created_by_monster_id,
        paid_by:paid_by_monster_id ( display_name )
      `)
      .order("expense_date", { ascending: false })
      .limit(200);

    if (error) setErr(error.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function deleteExpense(id, description) {
    const ok = window.confirm(`¿Eliminar "${description}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) setErr(error.message);
    else load();
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Todos los gastos</h1>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>Volver</button>
      </div>
      {err && <p style={{ color: "salmon" }}>{err}</p>}
      <div className="grid">
        {rows.map((r) => (
          <div key={r.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900 }}>{r.description}</div>
              {me && r.created_by_monster_id === me.id && (
                <button
                  className="btn btnSecondary"
                  style={{ fontSize: 12, padding: "4px 10px", borderColor: "#5a1a1a", color: "salmon" }}
                  onClick={() => deleteExpense(r.id, r.description)}
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="muted">
              {r.expense_date} · ${clp(r.amount)} · Pagó: {r.paid_by?.display_name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}