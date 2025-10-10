import React from 'react';

const StockBadge: React.FC<{onHand:number; min?:number}> = ({onHand, min=0}) => {
  const color = onHand<=0 ? 'text-red-500 bg-red-500/10 border border-red-500/20' 
              : onHand<=min ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' 
              : 'text-green-500 bg-green-500/10 border border-green-500/20';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {onHand}
    </span>
  );
};

export default StockBadge;
