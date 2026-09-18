/** Gateways and server errors can return text/HTML instead of JSON. */
export async function readAnalysisResponse(response: Response) {
  const text = await response.text();
  let data: Record<string, unknown> | unknown[] | null = null;
  try {
    data = text.trim() ? JSON.parse(text) : null;
  } catch {
    // Never expose a JSON parser stack or an upstream HTML error page to the user.
  }
  if (!response.ok) {
    const detail = data && !Array.isArray(data) && typeof data.detail === 'string' ? data.detail : null;
    throw new Error(detail || (response.status === 413 ? '文件过大，请上传不超过 10 MB 的简历。' : '分析服务暂时不可用，请稍后重试。'));
  }
  if (!data || typeof data !== 'object') {
    throw new Error('分析服务未返回完整结果，请稍后重试。');
  }
  return data;
}
