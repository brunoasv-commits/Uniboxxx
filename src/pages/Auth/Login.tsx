import React, { useState } from "react";
import { login, resetPasswordWithTemporary } from "../../lib/auth";

export default function Login({ onLogged }: { onLogged: () => void }) {
  const [view, setView] = useState<'login' | 'reset'>('login');
  
  // States for login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Common states
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  async function handleSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await login(email.trim(), password);
    setBusy(false);
    if (!res.ok) { setMsg({ type: 'error', text: res.error || "Falha ao entrar" }); return; }
    onLogged();
  }

  async function handleSubmitReset(e: React.FormEvent) {
      e.preventDefault();
      setBusy(true); setMsg(null);
      const res = await resetPasswordWithTemporary(email.trim());
      setBusy(false);
      
      // For security, always show a generic message, whether the email exists or not.
      setMsg({ type: 'success', text: "Se um usuário com este e-mail existir, uma nova senha foi gerada." });
      
      if (res.ok && res.temporaryPassword) {
        // For developer convenience during testing, log the password to the console.
        console.log(`Senha temporária para ${email.trim()}: ${res.temporaryPassword}`);
      }
      
      // Redirect back to login after a delay
      setTimeout(() => {
        setView('login');
        setMsg(null);
      }, 4000);
  }

  const renderMessage = () => {
      if (!msg) return null;
      const colorClass = msg.type === 'error' ? 'text-red-300' : 'text-green-300';
      return <div className={`my-3 p-2 rounded-md text-xs text-center ${msg.type === 'error' ? 'bg-red-500/10' : 'bg-green-500/10'} ${colorClass}`}>{msg.text}</div>;
  }

  const renderLoginView = () => (
    <form onSubmit={handleSubmitLogin} className="w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 p-6">
      <h1 className="text-gray-100 text-lg font-semibold mb-1">Entrar</h1>
      <p className="text-sm text-gray-400 mb-4">Use seu e-mail e senha.</p>
      
      {renderMessage()}

      <label className="block text-xs text-gray-400 mb-1">E-mail</label>
      <input
        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-gray-200"
        type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com"
      />
      <div className="h-3" />

      <label className="block text-xs text-gray-400 mb-1">Senha</label>
      <input
        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-gray-200"
        type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
      />
      
      <div className="text-right mt-2">
          <button type="button" onClick={() => { setView('reset'); setMsg(null); }} className="text-xs text-sky-400 hover:text-sky-300">
              Esqueci a senha
          </button>
      </div>
      
      <div className="h-4" />

      <button type="submit" className="w-full h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-60" disabled={busy}>
        {busy ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );

  const renderResetView = () => (
    <form onSubmit={handleSubmitReset} className="w-full max-w-sm rounded-2xl bg-white/5 border border-white/10 p-6">
      <h1 className="text-gray-100 text-lg font-semibold mb-1">Redefinir Senha</h1>
      <p className="text-sm text-gray-400 mb-4">Informe seu e-mail para receber uma senha temporária.</p>

      {renderMessage()}

      <label className="block text-xs text-gray-400 mb-1">E-mail</label>
      <input
        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-gray-200"
        type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com"
        required
      />
      
      <div className="h-4" />

      <button type="submit" className="w-full h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold disabled:opacity-60" disabled={busy}>
        {busy ? "Gerando..." : "Gerar Senha Temporária"}
      </button>
      
      <div className="text-center mt-4">
          <button type="button" onClick={() => { setView('login'); setMsg(null); }} className="text-xs text-sky-400 hover:text-sky-300">
              Voltar para o login
          </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
      {view === 'login' ? renderLoginView() : renderResetView()}
    </div>
  );
}