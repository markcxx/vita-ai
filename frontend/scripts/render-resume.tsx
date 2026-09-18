/** Private stdin/stdout renderer. FastAPI owns data and resource ownership. */
import { withDefaultAvatars } from '../src/lib/resume/avatar-defaults';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateHtml } from '../src/lib/resume-export/builders';
import { generateDocxBuffer } from '../src/lib/resume-export/docx';
import { generatePdf, generateReportPdf } from '../src/lib/pdf/generate-pdf';
import type { Resume } from '../src/types/resume';

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 30_000_000) throw new Error('Resume payload too large');
  }
  const payload = JSON.parse(input);
  if (payload.format === 'report-pdf') {
    const html = payload.resume?.html;
    if (typeof html !== 'string' || html.length > 8_000_000) throw new Error('Invalid report snapshot');
    process.stdout.write(await generateReportPdf(html));
    return;
  }
  const { resume, format, forPrint, fitOnePage } = payload as {
    resume: Resume; format: string; forPrint?: boolean; fitOnePage?: boolean;
  };
  resume.sections = withDefaultAvatars(resume.sections);
  // Embed bundled sample/relative images; never permit arbitrary filesystem paths.
  const publicRoot = path.resolve(process.env.RESUME_PUBLIC_DIR || path.join(__dirname, '../public'));
  for (const section of resume.sections) {
    if (section.type !== 'personal_info' || typeof section.content.avatar !== 'string') continue;
    const avatar = section.content.avatar;
    if (avatar.startsWith('/images/')) {
      const filename = path.resolve(publicRoot, '.' + avatar);
      if (!filename.startsWith(publicRoot + path.sep)) throw new Error('Invalid avatar path');
      const mime = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
      section.content.avatar = `data:${mime};base64,${(await readFile(filename)).toString('base64')}`;
    }
  }
  if (format === 'docx') process.stdout.write(await generateDocxBuffer(resume));
  else {
    const html = await generateHtml(resume, format === 'pdf' || !!forPrint);
    if (format === 'html') process.stdout.write(html);
    else if (format === 'pdf') process.stdout.write(await generatePdf(html, { fitOnePage }));
    else throw new Error('Unsupported rendering format');
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Resume rendering failed'); process.exitCode = 1; });
