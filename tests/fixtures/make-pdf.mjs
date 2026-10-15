// Builds a minimal text-based PDF in memory so the e2e tests need no binary fixture.
// Each page is a list of lines; lines are drawn top to bottom in Helvetica.
export function makePdf(pages) {
  const escape = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  pages.forEach((lines, i) => {
    const content = `BT /F1 12 Tf 72 720 Td 16 TL ${lines.map((l) => `(${escape(l)}) Tj T*`).join(' ')} ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    );
  });

  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let n = 1; n < objects.length; n++) {
    offsets.push(out.length);
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
