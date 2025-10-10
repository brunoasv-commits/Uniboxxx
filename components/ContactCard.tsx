import React from "react";
import { Mail, Phone, MapPin, Edit, Copy, Power, Trash2, Circle } from "lucide-react";
import { Contact, ContactType } from "../types";
import Tip from "./Tip";

type Props = {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onDuplicate: (c: Contact) => void;
  onToggleActive: (c: Contact) => void;
  onDelete: (c: Contact) => void;
  isDeletable: boolean;
};

const TYPE_COLORS: Record<string, string> = {
  [ContactType.Cliente]: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20",
  [ContactType.Fornecedor]: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20",
  [ContactType.ParceiroArmazem]: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20",
  [ContactType.Socio]: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function colorFromName(name: string) {
  const p = ["bg-cyan-500", "bg-pink-500", "bg-emerald-500", "bg-sky-500", "bg-fuchsia-500", "bg-indigo-500"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length;
  return p[h];
}

const IconBtn: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  disabled?: boolean;
}> = ({ label, icon, onClick, danger, disabled }) => (
    <Tip label={label}>
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            disabled={disabled}
            className={`flex items-center justify-center h-8 w-8 rounded-full text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                danger
                ? "text-rose-300 hover:bg-rose-500/10 focus-visible:outline-rose-400"
                : "text-gray-300 hover:bg-gray-700/60 focus-visible:outline-blue-400"
            }`}
        >
            {icon}
        </button>
    </Tip>
);

const ContactCard: React.FC<Props> = ({ contact, onEdit, onDuplicate, onToggleActive, onDelete, isDeletable }) => {
  const badge = TYPE_COLORS[contact.type] ?? "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20";
  const avatarColor = colorFromName(contact.name || "??");
  const isActive = contact.isActive !== false;
  const stopPropagation = (e: React.MouseEvent, cb: (c: Contact) => void) => {
    e.stopPropagation();
    cb(contact);
  }

  return (
    <div className="relative group overflow-visible" aria-label={`Container for contact ${contact.name}`}>
       {/* Action bar that appears on hover/focus */}
       <div className="pointer-events-none absolute -right-3 -top-3 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
        <div className="pointer-events-auto rounded-full border border-gray-700 bg-gray-800/90 shadow-lg backdrop-blur-sm px-1 py-1 flex gap-1">
          <IconBtn label="Editar" onClick={(e) => stopPropagation(e, onEdit)} icon={<Edit className="w-4 h-4" />} />
          <IconBtn label="Duplicar" onClick={(e) => stopPropagation(e, onDuplicate)} icon={<Copy className="w-4 h-4" />} />
          <IconBtn label={isActive ? 'Inativar' : 'Ativar'} onClick={(e) => stopPropagation(e, onToggleActive)} icon={<Power className="w-4 h-4" />} />
          <IconBtn label={isDeletable ? 'Excluir' : 'Contato em uso'} onClick={(e) => stopPropagation(e, onDelete)} icon={<Trash2 className="w-4 h-4" />} danger disabled={!isDeletable} />
        </div>
      </div>
      
      {/* The actual card */}
      <article
        className="w-full h-full rounded-2xl border border-white/5 bg-slate-800/50 p-4 shadow-sm group-hover:shadow-md group-hover:border-white/10 transition-all cursor-pointer flex flex-col"
        role="button"
        tabIndex={0}
        onClick={() => onEdit?.(contact)}
        onKeyDown={(e) => e.key === "Enter" && onEdit?.(contact)}
        aria-label={`Abrir detalhes de ${contact.name}`}
      >
        <header className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-white ${avatarColor}`}>
            <span className="text-sm font-semibold">{initials(contact.name || "") || "?"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-100 leading-snug line-clamp-2 break-words" title={contact.name}>
              {contact.name || "Sem nome"}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${badge}`}>{contact.type}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-white/10">
                <Circle className={`h-2 w-2 ${isActive ? "text-emerald-400" : "text-slate-400"}`} fill="currentColor" />
                {isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </header>

        <ul className="mt-4 space-y-2 text-sm text-gray-300 flex-grow">
          <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400 flex-shrink-0" /><span className="truncate">{contact.email || "—"}</span></li>
          <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400 flex-shrink-0" /><span className="truncate">{contact.phone || "—"}</span></li>
          <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" /><span className="line-clamp-2">{contact.address || "—"}</span></li>
        </ul>
      </article>
    </div>
  );
};

export default ContactCard;