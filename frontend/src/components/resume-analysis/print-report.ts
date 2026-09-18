/** Download a PDF of the report, without invoking the browser's print dialog. */
export async function downloadReportPdf(report: HTMLElement, id: string, title: string) {
  await document.fonts.ready;
  const clone = report.cloneNode(true) as HTMLElement;
  clone.id = 'report-export';
  clone.querySelectorAll<HTMLElement>('[hidden]').forEach(node => node.removeAttribute('hidden'));
  clone.querySelectorAll('button, footer, a[href^="/"], script, iframe, object, embed').forEach(node => node.remove());
  // SVG chart geometry is copied directly, without transient Web Animations state.
  const styles = Array.from(document.styleSheets).map(sheet => {
    try { return Array.from(sheet.cssRules, rule => rule.cssText).join('\n'); }
    catch { return ''; }
  }).join('\n').replace(/<\/style/gi, '<\\/style');
  await Promise.all(Array.from(clone.querySelectorAll('img'), async image => {
    const url = new URL(image.src, window.location.href);
    if (url.protocol === 'data:') return;
    if (url.origin !== window.location.origin) { image.remove(); return; }
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('报告图片加载失败，请稍后重试。');
    const blob = await response.blob();
    image.src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();reader.onload = () => resolve(String(reader.result));reader.onerror = reject;reader.readAsDataURL(blob);
    });
    image.removeAttribute('srcset');image.removeAttribute('loading');
  }));
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"><title>分析报告</title><style>${styles}</style><style>
html,body{height:auto!important;overflow:visible!important;background:#fff!important;color:#171923!important}
#report-export{position:static!important;inset:auto!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;color:#171923!important;background:#fff!important}
#report-export *{animation:none!important;transition:none!important;content-visibility:visible!important}
#report-export svg{break-inside:avoid;max-width:100%}
#report-export h2,#report-export h3,#report-export h4{break-after:avoid}
#report-export [hidden]{display:block!important}
</style></head><body>${clone.outerHTML}</body></html>`;
  const response = await fetch(`/api/resume-analysis/${encodeURIComponent(id)}/pdf`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html }),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => null);
    throw new Error(typeof value?.detail === 'string' ? value.detail : '报告下载失败，请稍后重试。');
  }
  const blob = await response.blob();
  if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('服务未返回 PDF 文件，请稍后重试。');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');anchor.href = url;anchor.download = `${title.replace(/[\\/:*?"<>|]/g, '_') || '分析报告'}.pdf`;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
