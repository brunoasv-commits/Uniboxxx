
import React, { useState, useMemo } from "react";
import { CategoryType } from "../types";

const DEFAULT_PALETTE = [
  "#22C55E","#16A34A","#059669", // greens
  "#EF4444","#DC2626","#B91C1C", // reds
  "#F59E0B","#D97706",           // oranges
  "#3B82F6","#2563EB",           // blues
  "#A855F7","#EC4899"            // purple/pink
];

function normalizeHex(v?: string): string {
  if (!v) return "";
  const hex = v.trim().toUpperCase();
  // Allow 3-digit hex and convert to 6-digit
  if (/^#[0-9A-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : "";
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  defaultByKind: CategoryType;
};

export default function ColorField({ value, onChange, defaultByKind }: Props) {
  const [local, setLocal] = useState<string>(() => normalizeHex(value));

  const effectiveColor = useMemo(() => {
    if (local) return local;
    return defaultByKind === CategoryType.Receita ? '#22C55E' : '#EF4444';
  }, [local, defaultByKind]);

  function setHex(hex: string) {
    const norm = normalizeHex(hex);
    setLocal(norm);
    onChange(norm);
  }

  return (
    <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
            {DEFAULT_PALETTE.map((hex) => (
            <button
                key={hex}
                type="button"
                onClick={() => setHex(hex)}
                className={`h-7 w-7 rounded-md border-2 transition-all ${local === hex ? 'border-sky-400 scale-110' : 'border-white/10'}`}
                style={{ backgroundColor: hex }}
                aria-label={`Select color ${hex}`}
            />
            ))}
            <label className="ml-2 inline-flex items-center gap-2 text-sm text-gray-300">
                <div className="relative h-7 w-7 rounded-md border border-white/10 overflow-hidden">
                    <input
                        type="color"
                        value={local || effectiveColor}
                        onChange={(e) => setHex(e.target.value)}
                        className="absolute -top-1 -left-1 h-10 w-10 cursor-pointer"
                        aria-label="Pick a custom color"
                    />
                </div>
                <span className="text-xs text-gray-400 font-mono tracking-wider">{local || 'Padrão'}</span>
            </label>
        </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Prévia:</span>
            <div className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
                style={{ backgroundColor: effectiveColor, color: '#FFF' }}>
                Nome da Categoria
            </div>
        </div>
    </div>
  );
}
