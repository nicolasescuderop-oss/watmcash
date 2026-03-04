import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { clp } from "../helpers";

export default function AllExpenses() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id, description, expense_date, amount,
          paid_by:paid_by_monster_id ( display_name )
        `)
        .order("expense_date", { ascending: false })
        .limit(200);

      if (error) setErr(error.message);
      else setRows(data || []);
    })();
  }, []);

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
            <div style={{ fontWeight: 900 }}>{r.description}</div>
            <div className="muted">
              {r.expense_date} · ${clp(r.amount)} · Pagó: {r.paid_by?.display_name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}