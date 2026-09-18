'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Github, Loader2, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AppInput, AppPasswordInput } from './AppInput';
import { authClient, safeCallback } from '@/lib/auth-client';

const inputClass = 'h-11 rounded-lg';
const buttonClass = 'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white';
const linkClass = 'font-medium text-gray-950 hover:underline dark:text-gray-100';
export function AuthForm({ mode }: { mode: 'login' | 'register' | 'reset' }) {
  const search = useSearchParams();
  const callback = safeCallback(search.get('callbackUrl'));
  const resetToken = search.get('token');
  const [step, setStep] = useState<'email' | 'code' | 'account'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(search.has('error') ? '登录或重置链接无效，请重新尝试。' : '');
  const [notice, setNotice] = useState('');
  const [countdown, setCountdown] = useState(0);
  useEffect(() => { if (!countdown) return; const t = setTimeout(() => setCountdown(countdown - 1), 1000); return () => clearTimeout(t); }, [countdown]);
  async function requestCode() {
    const res = await fetch('/api/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '发送失败，请重试');
    setCountdown(60); setStep('code'); setNotice('验证码已发送，请检查邮箱（包括垃圾邮件）。');
  }
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '操作失败，请重试'); } finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await perform(async () => {
      if (mode === 'login') {
        const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
        if (result.error) throw new Error('邮箱或密码不正确，或操作太频繁，请稍后重试。');
        window.location.replace(callback); return;
      }
      if (mode === 'reset') {
        if (resetToken) {
          const result = await authClient.resetPassword({ token: resetToken, newPassword: password });
          if (result.error) throw new Error('重置失败，请确认密码要求或重新申请重置链接。');
          setNotice('密码已重置，请使用新密码登录。'); setPassword('');
        } else {
          const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: '/reset-password' });
          if (result.error) throw new Error('邮件发送失败，请稍后重试。');
          setNotice('如果该邮箱已注册，你将收到重置密码邮件。');
        }
        return;
      }
      if (step === 'email') return requestCode();
      if (step === 'code') {
        const res = await fetch('/api/auth/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '验证失败');
        setTicket(data.registrationToken); setStep('account'); return;
      }
      const result = await authClient.signUp.email({ email: email.trim().toLowerCase(), name: email.split('@')[0], password, fetchOptions: { headers: { 'x-vita-email-verification': ticket } } });
      if (result.error) { setStep('email'); setTicket(''); throw new Error('注册未完成，邮箱可能已注册或验证已过期，请登录或重新验证。'); }
      window.location.replace(callback);
    });
  }
  const needsPassword = mode === 'login' || (mode === 'register' && step === 'account') || (mode === 'reset' && !!resetToken);
  const passwordValid = password.length >= 8 && password.length <= 64 && /[a-zA-Z]/.test(password) && /\d/.test(password);
  const title = mode === 'login' ? '登录你的账户' : mode === 'reset' ? '重置密码' : step === 'code' ? '验证你的邮箱' : step === 'account' ? '设置你的密码' : '创建你的账户';
  return <div>
    <h1 className="text-[28px] font-semibold tracking-tight text-gray-950 dark:text-gray-50">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{mode === 'login' ? '欢迎回来，继续你的探索。' : mode === 'reset' ? (resetToken ? '设置一个安全的新密码。' : '输入注册邮箱，我们会发送重置密码链接。') : step === 'email' ? '注册账户，开启你的 AI 工作台。' : `使用邮箱 ${email} 完成注册。`}</p>
    {mode !== 'reset' && step === 'email' && <><button type="button" disabled={busy} onClick={() => perform(async () => { const result = await authClient.signIn.social({ provider: 'github', callbackURL: callback, errorCallbackURL: '/login?error=github' }); if (result.error) throw new Error('GitHub 登录暂不可用，请稍后重试。'); })} className="mt-7 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"><Github size={18}/>使用 GitHub 继续</button><div className="my-6 flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200 dark:bg-white/10"/>或使用邮箱<span className="h-px flex-1 bg-gray-200 dark:bg-white/10"/></div></>}
    <form onSubmit={submit} className="mt-6 space-y-4">
      {(mode === 'login' || (mode === 'register' && step === 'email') || (mode === 'reset' && !resetToken)) && <label className="block space-y-2 text-sm font-medium"><span>邮箱地址</span><AppInput className={inputClass} type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} required maxLength={320} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>}
      {mode === 'register' && step === 'code' && <label className="block space-y-2 text-sm font-medium"><span>邮箱验证码</span><AppInput className={`${inputClass} text-center text-lg tracking-[.5em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} minLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} required disabled={busy} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}/></label>}
      {needsPassword && <label className="block space-y-2 text-sm font-medium"><span>密码</span><AppPasswordInput inputClassName={inputClass} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? '输入你的密码' : '至少 8 位，包含字母和数字'} minLength={8} maxLength={64} required disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></label>}
      {needsPassword && mode !== 'login' && <div className="space-y-1 text-xs text-gray-500">{[[password.length >= 8, '至少 8 位字符'], [/[a-zA-Z]/.test(password) && /\d/.test(password), '包含字母和数字']].map(([ok, label]) => <p className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : ''}`} key={String(label)}><Check size={13}/>{label}</p>)}</div>}
      {mode === 'login' && <div className="text-right text-xs"><Link href="/reset-password" className={linkClass}>忘记密码？</Link></div>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-white/5 dark:text-gray-300">{notice}</p>}
      <button className={buttonClass} disabled={busy || (needsPassword && mode !== 'login' && !passwordValid)}>{busy && <Loader2 size={16} className="animate-spin"/>}{mode === 'login' ? '登录' : mode === 'reset' ? (resetToken ? '更新密码' : '发送重置链接') : step === 'email' ? '发送验证码' : step === 'code' ? '验证并继续' : '创建账户'}</button>
    </form>
    {mode === 'register' && step === 'code' && <div className="mt-4 flex justify-between text-xs"><button type="button" className={linkClass} disabled={busy} onClick={() => { setStep('email'); setCode(''); setNotice(''); }}>更换邮箱</button><button type="button" className="disabled:text-gray-400" disabled={busy || countdown > 0} onClick={() => perform(requestCode)}>{countdown ? `${countdown} 秒后重新发送` : '重新发送验证码'}</button></div>}
    <p className="mt-7 text-center text-sm text-gray-500">{mode === 'login' ? <>还没有账户？ <Link className={linkClass} href={`/register?callbackUrl=${encodeURIComponent(callback)}`}>立即注册</Link></> : <>已有账户？ <Link className={linkClass} href={`/login?callbackUrl=${encodeURIComponent(callback)}`}>返回登录</Link></>}</p>
  </div>;
}
