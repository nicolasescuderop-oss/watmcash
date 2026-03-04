import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { getMonster } from "../storage";
import { clp } from "../helpers";

export default function MyReceivables() {
  const nav = useNavigate();
  const monsterCode = getMonster();
  const [me, setMe] = useState(null);
  const [payments, setPayments] = useState([]);
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
        id, amount, status, paid_at, marked_paid_by_monster_id,
        expense_id,
        expenses:expense_id ( description, expense_date, amount ),
        from_monster:from_monster_id ( id, display_name )
      `)
      .eq("to_monster_id", meData.id)
      .order("created_at", { ascending: false });

    if (error) return setErr(error.message);
    setPayments(data || []);
  }

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      const key = p.expense_id;
      if (!map.has(key)) map.set(key, { expense: p.expenses, items: [] });
      map.get(key).items.push(p);
    }
    return Array.from(map.entries()).map(([, v]) => v);
  }, [payments]);

  async function markPaid(paymentId) {
    if (!me) return;
    // Bilateral: el acreedor también puede marcar como pagado
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
        <h1 className="h1">Cobros</h1>
        <button className="btn btnSecondary" onClick={() => nav("/dashboard")}>Volver</button>
      </div>

      {err && <p style={{ color: "salmon" }}>{err}</p>}

      {grouped.length === 0 ? (
        <div className="card">Aún no hay registros.</div>
      ) : (
        <div className="grid">
          {grouped.map((g, idx) => {
            const pending = g.items.filter((x) => x.status === "pending");
            const isClosed = pending.length === 0;

            return (
              <div key={idx} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{g.expense?.description}</div>
                    <div className="muted">{g.expense?.expense_date} · Total: ${clp(g.expense?.amount || 0)}</div>
                  </div>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    {isClosed ? "CERRADO" : "ABIERTO"}
                  </div>
                </div>

                <div className="hr" />

                <div className="grid">
                  {g.items.map((p) => (
                    <div key={p.id} className="row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {p.from_monster?.display_name} · ${clp(p.amount)}
                        </div>
                        <div className="muted">
                          Estado: {p.status === "paid" ? "pagado" : "pendiente"}
                        </div>
                      </div>

                      {p.status === "pending" ? (
                        <button className="btn" onClick={() => markPaid(p.id)}>
                          Marcar como pagado
                        </button>
                      ) : (
                        <span className="muted">✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}