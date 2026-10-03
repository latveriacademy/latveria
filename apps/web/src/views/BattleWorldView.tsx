import { Link } from "react-router";
import { ArrowRight, Swords } from "lucide-react";
import { Button } from "../components/ui/button";
import { PageHeading, Panel } from "../components/ui/dashboard";

export function BattleWorldView() {
  return <div className="latveria-view-container">
    <PageHeading title="Battle World" description="Ruang tryout UTBK-SNBT." />
    <Panel className="battle-world-empty">
      <Swords size={32} aria-hidden="true" />
      <h2>Tryout belum tersedia</h2>
      <p>Belum ada tryout yang bisa kamu mulai di sini. Sambil menunggu, asah skill per subtes lewat Drilling.</p>
      <Button asChild><Link to="/dashboard?tab=practice">Gas drilling<ArrowRight /></Link></Button>
    </Panel>
  </div>;
}
