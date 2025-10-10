import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [operator, setOperator] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(true);

  // For dragging
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 144, y: window.innerHeight / 2 - 220 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const calculatorRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (calculatorRef.current) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - calculatorRef.current.offsetLeft,
        y: e.clientY - calculatorRef.current.offsetTop,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNumberClick = (num: string) => {
    if (isNewEntry) {
      setDisplay(num);
      setIsNewEntry(false);
    } else {
      setDisplay(prev => (prev === '0' ? num : prev + num));
    }
  };
  
  const calculate = () => {
    if (operator && previousValue !== null) {
      const currentValue = parseFloat(display);
      let result = 0;
      switch (operator) {
        case '+': result = previousValue + currentValue; break;
        case '-': result = previousValue - currentValue; break;
        case '*': result = previousValue * currentValue; break;
        case '/': result = previousValue / currentValue; break;
        default: return previousValue;
      }
      return result;
    }
    return parseFloat(display);
  }

  const handleOperatorClick = (op: string) => {
    const result = calculate();
    setDisplay(String(result));
    setPreviousValue(result);
    setOperator(op);
    setIsNewEntry(true);
  };

  const handleEquals = () => {
    const result = calculate();
    setDisplay(String(result));
    setOperator(null);
    setPreviousValue(null);
    setIsNewEntry(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setOperator(null);
    setPreviousValue(null);
    setIsNewEntry(true);
  };
  
  const handleDecimal = () => {
    if (isNewEntry) {
        setDisplay('0.');
        setIsNewEntry(false);
    } else if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
  ];

  const handleButtonClick = (btn: string) => {
    if (/\d/.test(btn)) {
        handleNumberClick(btn);
    } else if (['/', '*', '-', '+'].includes(btn)) {
        handleOperatorClick(btn);
    } else if (btn === '=') {
        handleEquals();
    } else if (btn === '.') {
        handleDecimal();
    }
  };

  return (
    <div
      ref={calculatorRef}
      className="fixed z-[101] w-72 rounded-xl border border-white/10 bg-[#1a2233] shadow-2xl backdrop-blur-sm flex flex-col"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <header
        className="flex items-center justify-between px-3 py-1 border-b border-white/10 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <h4 className="text-xs text-gray-400">Calculadora</h4>
        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-white/10" aria-label="Fechar calculadora"><X size={14} /></button>
      </header>
      <div className="p-3">
        <div className="h-12 w-full rounded-md bg-black/30 text-right text-3xl font-mono text-white p-2 mb-3 overflow-x-auto">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-2">
            <button
                onClick={handleClear}
                className="col-span-4 h-12 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xl"
            >
                C
            </button>
          {buttons.map(btn => {
            const isOperator = ['/', '*', '-', '+'].includes(btn);
            const isEquals = btn === '=';
            return (
                <button
                    key={btn}
                    onClick={() => handleButtonClick(btn)}
                    className={`h-12 rounded-md text-gray-100 hover:bg-white/10 text-xl
                        ${isOperator ? 'bg-sky-500/20 text-sky-300' : ''}
                        ${isEquals ? 'bg-emerald-500/20 text-emerald-300' : ''}
                        ${!isOperator && !isEquals ? 'bg-white/5' : ''}
                    `}
                >
                {btn}
                </button>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default Calculator;
