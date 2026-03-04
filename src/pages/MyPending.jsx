import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp } from "../helpers";

export default function MyPending() {
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
      .from("payments")
      .select(`
        id, amount, status,
        from_monster_id, to_monster_id,
        marked_paid_by_monster_id,
        expense_id,
        expenses:expense_id ( description, expense_date, amount ),
        to_monster:to_monster_id ( display_name )
      `)
      .eq("from_monster_id", meData.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) return setErr(error.message);
    setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function markPaid(paymentId) {
    if (!me) return;
    const { error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        marked_paid_by_monster_id: me.id,
      })
      .eq("id", paymentId);
    if (error) setErr(error.message);
    else load();
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Pagos pendientes</h1>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>Volver</button>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      {rows.length === 0 ? (
        <div className="card">No tienes pagos pendientes 🎉</div>
      ) : (
        <div className="grid">
          {rows.map((r) => (
            <div key={r.id} className="card">
              <div style={{ fontWeight: 800 }}>{r.expenses?.description}</div>
              <div className="muted">
                {r.expenses?.expense_date} · Total gasto: ${clp(r.expenses?.amount || 0)}
              </div>
              <div className="muted">
                Debes pagar <b>${clp(r.amount)}</b> a <b>{r.to_monster?.display_name}</b>
              </div>
              <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => markPaid(r.id)}>Marcar como pagado</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}