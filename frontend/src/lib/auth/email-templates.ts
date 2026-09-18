/** Match mark-ai's authentication emails while keeping this application's branding. */
const containerStyle = 'max-width:480px;margin:0 auto;font-family:system-ui,sans-serif;padding:24px';

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, character => entities[character]);
}

export function verificationCodeEmail(code: string, expiresInSeconds: number) {
  const appName = process.env.APP_NAME || 'VitaAI';
  const duration = expiresInSeconds % 60 === 0 ? `${expiresInSeconds / 60} 分钟` : `${expiresInSeconds} 秒`;
  return {
    subject: `${appName} — 你的验证码是 ${code}`,
    text: `邮箱验证\n\n你的验证码是：${code}\n\n验证码将在 ${duration}后失效，请尽快完成验证。\n\n如果你没有请求此验证码，请忽略此邮件。`,
    html: `
      <div style="${containerStyle}">
        <h2 style="color:#111;margin-bottom:8px">邮箱验证</h2>
        <p style="color:#333">你的验证码是：</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;margin:16px 0;background:#f5f5f5;border-radius:12px;color:#111">${escapeHtml(code)}</div>
        <p style="color:#666;font-size:14px">验证码将在 ${duration}后失效，请尽快完成验证。</p>
        <p style="color:#999;font-size:12px;margin-top:24px">如果你没有请求此验证码，请忽略此邮件。</p>
      </div>
    `,
  };
}

export function resetPasswordEmail(url: string) {
  const safeUrl = escapeHtml(url);
  return {
    subject: `${process.env.APP_NAME || 'VitaAI'} — 重置密码`,
    text: `重置密码\n\n请打开以下链接重置你的密码：\n${url}\n\n如果你没有请求重置密码，请忽略此邮件。`,
    html: `
      <div style="${containerStyle}">
        <h2 style="color:#111">重置密码</h2>
        <p>点击下方按钮重置你的密码：</p>
        <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">
          重置密码
        </a>
        <p style="color:#666;font-size:14px">如果按钮无法点击，请复制此链接到浏览器：<br/>${safeUrl}</p>
        <p style="color:#999;font-size:12px">如果你没有请求重置密码，请忽略此邮件。</p>
      </div>
    `,
  };
}

export function existingAccountEmail() {
  return {
    subject: `${process.env.APP_NAME || 'VitaAI'} — 邮箱验证`,
    text: '该邮箱已注册，请直接登录。如忘记密码，可在登录页重置密码。\n\n如果你没有请求此邮件，请忽略此邮件。',
    html: `
      <div style="${containerStyle}">
        <h2 style="color:#111;margin-bottom:8px">邮箱验证</h2>
        <p style="color:#333">该邮箱已注册，请直接登录。</p>
        <p style="color:#666;font-size:14px">如忘记密码，可在登录页重置密码。</p>
        <p style="color:#999;font-size:12px;margin-top:24px">如果你没有请求此邮件，请忽略此邮件。</p>
      </div>
    `,
  };
}
