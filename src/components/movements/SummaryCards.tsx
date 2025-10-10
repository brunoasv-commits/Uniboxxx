
import { ArrowDownCircle, ArrowUpCircle, Calculator, TrendingUp } from 'lucide-react';
import { formatBRL } from '../../../utils/num';

type Props = {
  inflow: number;
  outflow: number;
  net: number;
  projectedBalance: number;
  loading?: boolean;
};

export default function SummaryCards({ inflow, outflow, net, projectedBalance, loading }: Props) {
  const skeleton = loading ? 'animate-pulse bg-slate-800 h-6 w-24 rounded' : '';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={<ArrowDownCircle className="text-emerald-400" />} label="Entradas (líquido)"
            value={loading ? '' : formatBRL(inflow)} skeleton={skeleton}/>
      <Card icon={<ArrowUpCircle className="text-rose-400" />} label="Saídas (líquido)"
            value={loading ? '' : formatBRL(outflow)} skeleton={skeleton}/>
      <Card icon={<Calculator className="text-sky-400" />} label="Resultado"
            value={loading ? '' : formatBRL(net)} skeleton={skeleton}/>
      <Card icon={<TrendingUp className="text-indigo-400" />} label="Saldo projetado"
            value={loading ? '' : formatBRL(projectedBalance)} skeleton={skeleton}/>
    </div>
  );
}

function Card({ icon, label, value, skeleton }: any) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-800/60">{icon}</div>
        <div>
          <div className="text-xs text-slate-400">{label}</div>
          {skeleton ? <div className={skeleton} /> : <div className="text-lg font-semibold text-gray-200">{value}</div>}
        </div>
      </div>
    </div>
  );
}