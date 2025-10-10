import React from 'react';

const nf = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

interface MarginCalculatorProps {
    cost: number;
    price: number;
    target?: number;
    onApply: (newPrice: number) => void;
}

const MarginCalculator: React.FC<MarginCalculatorProps> = ({cost, price, target=30, onApply}) => {
  const margin = price <= 0 ? 0 : ((price - cost) / price) * 100;
  const targetPrice = cost > 0 ? cost / (1 - target / 100) : 0;
  
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md bg-gray-100 dark:bg-gray-900/50 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Custo: <b>{nf.format(cost)}</b></span>
        <span>Preço: <b>{nf.format(price)}</b></span>
        <span className={`font-bold ${margin < 0 ? 'text-[var(--err)]' : margin < target ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>
          Margem: {margin.toFixed(1)}%
        </span>
      </div>
      <button 
        type="button" 
        className="rounded-md px-2 py-1 bg-blue-600/20 text-blue-300 text-xs hover:bg-blue-600/30 transition-colors" 
        onClick={() => onApply(Number(targetPrice.toFixed(2)))}
      >
        Aplicar alvo ({target}%)
      </button>
    </div>
  );
}

export default MarginCalculator;
