
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Contact, ContactType } from '../../../types';
import ContactFormModal from '../../../components/ContactFormModal';
import Button from '../../../components/ui/Button';
import { Plus } from 'lucide-react';
import { useDebounced } from '../../hooks/useDebounced';

interface ContactPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: Contact) => void;
  contactType?: ContactType; // Optional filter by type
  allowCreateNew?: boolean;
  onCreateNewContact?: () => void;
}

const ContactPicker: React.FC<ContactPickerProps> = ({ isOpen, onClose, onSelect, contactType, allowCreateNew, onCreateNewContact }) => {
  const { state } = useData();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filteredContacts = useMemo(() => {
    return state.contacts.filter(c => 
      c.isActive !== false &&
      (!contactType || c.type === contactType) && 
      (c.name.toLowerCase().includes(debounced.toLowerCase()) ||
       c.email?.toLowerCase().includes(debounced.toLowerCase()) ||
       c.phone?.includes(debounced))
    );
  }, [state.contacts, contactType, debounced]);
  
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
  };
  
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filteredContacts.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter") { const pick = filteredContacts[highlight]; if (pick) onSelect(pick); }
  };

  const highlightText = (text: string) => {
    const q = debounced.trim();
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-600/40 text-yellow-200 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="contact-picker-title">
        <div className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h2 id="contact-picker-title" className="text-lg font-semibold text-gray-100">{`Selecionar Contato`}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
          </div>
          
          {/* Controls */}
          <div className="px-5 pt-4 pb-2 flex items-center gap-3">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              autoFocus
            />
            {allowCreateNew && (
                <Button variant="secondary" onClick={onCreateNewContact}>
                <Plus size={16} className="mr-2" /> Novo
                </Button>
            )}
          </div>

          {/* Table */}
          <div className="px-5 pb-2">
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800/50 text-gray-300">
                  <tr>
                    <th className="text-left px-3 py-2 w-12"></th>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Email / Telefone</th>
                  </tr>
                </thead>
                <tbody onKeyDown={handleKey}>
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact, i) => (
                      <tr
                        key={contact.id}
                        className={`cursor-pointer ${i === highlight ? "bg-blue-900/30" : "hover:bg-gray-800/50"}`}
                        onClick={() => handleSelect(contact)}
                      >
                        <td className="px-3 py-2 text-center">
                            <input
                                type="radio"
                                name="contact-picker-selection"
                                readOnly
                                checked={i === highlight}
                                className="h-4 w-4 accent-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 ring-offset-gray-900"
                            />
                        </td>
                        <td className="px-3 py-2 text-gray-100 font-medium">
                            {highlightText(contact.name)}
                        </td>
                         <td className="px-3 py-2 text-gray-300">{contact.type}</td>
                         <td className="px-3 py-2 text-gray-400">{contact.email || contact.phone}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Nenhum contato encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end px-5 py-4 border-t border-gray-800 gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => { const pick = filteredContacts[highlight]; if (pick) handleSelect(pick); }}
                disabled={filteredContacts.length === 0}
              >
                Selecionar
              </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPicker;