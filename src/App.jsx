import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ChooseMonster from "./pages/ChooseMonster";
import Dashboard from "./pages/Dashboard";
import AddExpense from "./pages/AddExpense";
import MyPending from "./pages/MyPending";
import MyReceivables from "./pages/MyReceivables";
import AllExpenses from "./pages/AllExpenses";
import { getMonster } from "./storage";

function RequireMonster({ children }) {
  const m = getMonster();
  if (!m) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ChooseMonster />} />
          <Route path="/dashboard" element={<RequireMonster><Dashboard /></RequireMonster>} />
          <Route path="/add" element={<RequireMonster><AddExpense /></RequireMonster>} />
          <Route path="/pending" element={<RequireMonster><MyPending /></RequireMonster>} />
          <Route path="/receivables" element={<RequireMonster><MyReceivables /></RequireMonster>} />
          <Route path="/expenses" element={<RequireMonster><AllExpenses /></RequireMonster>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}