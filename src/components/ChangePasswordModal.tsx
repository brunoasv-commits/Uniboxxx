import React, { useState } from 'react';
import { useAccess } from '../contexts/AccessProvider';
import { changePassword } from '../lib/auth';
import ModalShell from './modal/ModalShell';
import { Section } from './form/Section';
import { Field, Input } from './form/Field';
import Button from '../../components/ui/Button';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { current } = useAccess();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setBusy(true);
    setMsg(null);
    const result = await changePassword(current.id, currentPassword, newPassword);
    setBusy(false);

    if (result.ok) {
      setMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setMsg({ type: 'error', text: result.error || 'Falha ao alterar a senha.' });
    }
  };

  if (!isOpen) return null;
  
  const renderMessage = () => {
      if (!msg) return null;
      const colorClass = msg.type === 'error' ? 'text-red-300' : 'text-green-300';
      return <div className={`my-3 p-2 rounded-md text-xs text-center ${msg.type === 'error' ? 'bg-red-500/10' : 'bg-green-500/10'} ${colorClass}`}>{msg.text}</div>;
  }

  return (
    <ModalShell
      title="Alterar Senha"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="change-password-form" disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit}>
        <Section title="Alteração de Senha Segura">
           {renderMessage()}
          <div className="grid grid-cols-1 gap-4">
            <Field label="Senha Atual">
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </Field>
            <Field label="Nova Senha">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </Field>
            <Field label="Confirmar Nova Senha">
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </Field>
          </div>
        </Section>
      </form>
    </ModalShell>
  );
};

export default ChangePasswordModal;