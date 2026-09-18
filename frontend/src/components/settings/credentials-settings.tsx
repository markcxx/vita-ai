'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { loadCredentials, saveCredentials, emptyCredentials } from '@/lib/local-credentials';
import { AppInput, AppPasswordInput } from '@/components/auth/AppInput';
export function CredentialsSettings() {
  const [value, setValue] = useState(loadCredentials);
  const change = (field: keyof typeof value, text: string) => setValue(current => ({ ...current, [field]: text }));
  return <div className="space-y-4 text-sm"><p className="rounded-lg bg-sky-50 p-3 text-sky-900 dark:bg-sky-950 dark:text-sky-100">使用 AI 功能前，请填写自己的模型 API Key、Base URL 和模型名称。语音密钥仅在使用语音功能时需要。</p><p className="text-xs leading-5 text-zinc-500">密钥仅保存在此浏览器，按账户区分，不会同步到数据库。更换设备需要重新填写。调用服务时通过后端转发。</p>
    <label className="block space-y-1.5"><span>模型服务</span><select aria-label="模型服务" className="h-9 w-full rounded-md border bg-transparent px-2" value={value.provider} onChange={e => change('provider', e.target.value)}><option value="openai">OpenAI 兼容接口</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select></label>
    <label className="block space-y-1.5"><span>Base URL</span><AppInput placeholder="https://api.openai.com/v1" value={value.baseUrl} onChange={e => change('baseUrl', e.target.value)}/></label>
    <label className="block space-y-1.5"><span>模型名称</span><AppInput placeholder="例如 gpt-4o" value={value.model} onChange={e => change('model', e.target.value)}/></label>
    <label className="block space-y-1.5"><span>模型 API Key</span><AppPasswordInput autoComplete="off" placeholder="填写你的模型密钥" value={value.apiKey} onChange={e => change('apiKey', e.target.value)}/></label>
    <div className="border-t pt-3"><label className="block space-y-1.5"><span>语音服务 API Key</span><AppPasswordInput autoComplete="off" placeholder="填写你的 DashScope 密钥" value={value.voiceApiKey} onChange={e => change('voiceApiKey', e.target.value)}/></label><p className="mt-2 text-xs text-zinc-500">语音服务地址固定，由应用统一配置。</p></div>
    <div className="flex gap-2"><button type="button" className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={() => { try { if (value.apiKey && (!value.baseUrl || !value.model)) throw new Error('请同时填写 Base URL 和模型名称'); if (value.baseUrl && !/^https?:\/\//.test(value.baseUrl)) throw new Error('Base URL 必须以 http:// 或 https:// 开头'); saveCredentials(value); toast.success('已保存到此浏览器'); } catch (e) { toast.error(e instanceof Error ? e.message : '浏览器存储不可用'); } }}>保存到本地</button><button type="button" className="rounded-md border px-4 py-2" onClick={() => { try { saveCredentials(emptyCredentials); setValue({ ...emptyCredentials }); toast.success('本地密钥已清除'); } catch { toast.error('浏览器存储不可用'); } }}>清除</button></div>
  </div>;
}
