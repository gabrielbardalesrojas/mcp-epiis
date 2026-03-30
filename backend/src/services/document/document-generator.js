import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');

// --- docx imports ---
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TabStopType, TabStopPosition, UnderlineType, ImageRun,
} from 'docx';

import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// BRAND TOKENS  — Change here to re-theme all documents at once
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  // PDF  (rgb 0–1)
  pdf: {
    primary: rgb(0.10, 0.22, 0.54),   // deep blue
    secondary: rgb(0.95, 0.40, 0.10),   // orange accent
    text: rgb(0.15, 0.15, 0.15),
    muted: rgb(0.45, 0.45, 0.45),
    surface: rgb(0.95, 0.96, 0.98),   // light blue-grey bg
    white: rgb(1, 1, 1),
    accent: rgb(0.98, 0.75, 0.15),   // ★ NEW: amber highlight
    success: rgb(0.13, 0.55, 0.13),   // ★ NEW: green for callouts
  },
  // DOCX (hex strings, no #)
  docx: {
    primary: '1A3887',
    secondary: 'F26519',
    accent: 'F9A825',               // ★ NEW: amber for badges / highlights
    text: '262626',
    muted: '737373',
    surface: 'F0F2FA',
    tableHead: '1A3887',
    tableAlt: 'F0F2FA',
    white: 'FFFFFF',
    success: '1B5E20',               // ★ NEW: dark green
    codeBlock: 'F4F4F8',               // ★ NEW: code background
    codeFg: '1A3887',               // ★ NEW: code text
    font: 'Times New Roman',         // ★ NEW: Official academic font
  },
  // PPTX (hex strings, no #)
  pptx: {
    primary: '1A3887',
    secondary: 'F26519',
    text: '1A1A1A',
    muted: '737373',
    light: 'FFFFFF',
    surface: 'F0F2FA',
    accent: 'F9A825',                // ★ NEW
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// PRODUCER v2 — Professional Academic Document Generator
// ─────────────────────────────────────────────────────────────────────────────


/**
 * Generador de documentos académicos multiformato — versión profesional v2
 * Produce Word, PDF, Excel y PowerPoint con diseño de nivel editorial.
 *
 * MEJORAS v2 respecto a v1:
 *  ★ DOCX: portada de alta calidad (banner de color + tabla de metadatos)
 *  ★ DOCX: secciones h1 con borde inferior grueso (como en producción)
 *  ★ DOCX: bloque de código monoespacio con fondo gris
 *  ★ DOCX: párrafo tipo "callout" con borde lateral
 *  ★ DOCX: tabla con anchos explícitos en cada celda (evita bugs en Google Docs)
 *  ★ DOCX: soporte para columnas de tabla proporcionales configurables
 *  ★ DOCX: separador de página tipográfico
 *  ★ DOCX: ítem tipo 'kv' (clave: valor) inline
 *  ★ PDF:  portada con bloque inferior de metadatos (tabla firma)
 *  ★ PDF:  bloque de código con fondo gris y fuente Courier
 *  ★ PDF:  callout boxes (fondo de color + texto destacado)
 *  ★ PDF:  soporte para listas numeradas automáticas
 *  ★ PDF:  tablas con anchos de columna configurables
 *  ★ PDF:  TOC (tabla de contenido) generado automáticamente
 */
export class DocumentGenerator {
  constructor(config = {}) {
    this.templatesPath = config.templatesPath || path.join(process.cwd(), 'storage', 'templates');
    this.outputPath = config.outputPath || path.join(process.cwd(), 'storage', 'generated');
    this.logger = new Logger('DocumentGenerator');
  }

  async initialize() {
    await fs.mkdir(this.templatesPath, { recursive: true });
    await fs.mkdir(this.outputPath, { recursive: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF — Professional multi-page layout with brand header / footer
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera un PDF profesional de alta calidad con soporte Markdown-lite.
   *
   * @param {string} title
   * @param {string} content  - Soporta:
   *     # ## ### headings        - / * listas       | col | col | tablas
   *     --- divisores            ```code``` bloques  > callout boxes
   *     1. listas numeradas      **negrita**
   * @param {string|null} outputPath
   * @param {object} meta     - { institution, department, date, version, toc }
   *     meta.toc = true  →  genera tabla de contenido automática en pág. 2
   */
  async generatePDF(title, content, outputPath = null, meta = {}) {
    try {
      await this.initialize();

      const cleanStr = (s) => (s || '').replace(/[^\x20-\x7E\u00A0-\u024F\r\n\t]/g, '');
      title = cleanStr(title);
      content = cleanStr(content);
      meta = {
        ...meta,
        institution: cleanStr(meta.institution),
        department: cleanStr(meta.department),
        date: cleanStr(meta.date),
        version: cleanStr(meta.version)
      };

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);       // ★ NEW

      // Page geometry (A4)
      const PW = 595.28, PH = 841.89;
      const ML = 56, MR = 56, MT = 56, MB = 72;
      const CW = PW - ML - MR;

      const C = BRAND.pdf;

      // ── render state ──────────────────────────────────────────────────────
      let page = null;
      let y = 0;
      const pages = [];

      // ★ NEW: TOC entries collected during render
      const tocEntries = [];

      const addPage = () => {
        page = pdfDoc.addPage([PW, PH]);
        pages.push(page);
        y = PH - MT;
        _drawPageDecor(page, false);
        return page;
      };

      const ensureSpace = (needed = 20) => {
        if (y - needed < MB + 30) { addPage(); }
      };

      // ── decorative helpers ────────────────────────────────────────────────
      const _drawPageDecor = (p, isCover) => {
        // Left accent bar
        p.drawRectangle({ x: 0, y: 0, width: 8, height: PH, color: C.primary });
        // Top thin rule
        p.drawLine({
          start: { x: ML, y: PH - 38 }, end: { x: PW - MR, y: PH - 38 },
          thickness: 0.5, color: C.primary, opacity: 0.25,
        });

        if (!isCover) {
          p.drawText((meta.institution || 'FIIS-UNAS').toUpperCase(),
            { x: ML, y: PH - 30, size: 7, font: boldFont, color: C.primary, opacity: 0.8 });
          p.drawText(title,
            { x: ML, y: PH - 42, size: 7, font: italicFont, color: C.muted });
        }
      };

      // ── COVER PAGE ────────────────────────────────────────────────────────
      page = pdfDoc.addPage([PW, PH]);
      pages.push(page);
      _drawPageDecor(page, true);

      // Upper coloured band
      page.drawRectangle({ x: 8, y: PH * 0.42, width: PW - 8, height: PH * 0.58, color: C.primary });

      // Cover title (word-wrapped)
      const coverWords = title.toUpperCase().split(' ');
      let line = '';
      let cy = PH * 0.42 + PH * 0.58 - 80;
      const coverFontSize = 28;
      for (const word of coverWords) {
        const test = line + (line ? ' ' : '') + word;
        if (boldFont.widthOfTextAtSize(test, coverFontSize) > CW - 30 && line) {
          page.drawText(line, { x: ML + 10, y: cy, size: coverFontSize, font: boldFont, color: C.white });
          cy -= coverFontSize + 10;
          line = word;
        } else { line = test; }
      }
      if (line) page.drawText(line, { x: ML + 10, y: cy, size: coverFontSize, font: boldFont, color: C.white });

      // ★ NEW: Accent rule under title
      page.drawLine({
        start: { x: ML + 10, y: cy - 16 }, end: { x: ML + 200, y: cy - 16 },
        thickness: 3, color: C.accent,
      });

      // Meta lines
      const metaLines = [
        meta.department || '',
        meta.date || new Date().toLocaleDateString('es-PE'),
        meta.version ? `Versión ${meta.version}` : '',
      ].filter(Boolean);
      let my = cy - 44;
      for (const ml of metaLines) {
        page.drawText(ml, { x: ML + 10, y: my, size: 11, font, color: C.white, opacity: 0.85 });
        my -= 18;
      }

      // Lower white panel
      page.drawRectangle({ x: 8, y: 0, width: PW - 8, height: PH * 0.42 - 1, color: C.white });

      // ★ NEW: Metadata table on cover bottom panel
      const coverMeta = [
        ['Institución', meta.institution || 'FIIS-UNAS'],
        ['Departamento', meta.department || ''],
        ['Fecha', meta.date || new Date().toLocaleDateString('es-PE')],
        ['Versión', meta.version || '1.0.0'],
      ].filter(r => r[1]);
      let tableY = PH * 0.38;
      const colLW = 120, colVW = CW - colLW;
      page.drawRectangle({ x: ML, y: tableY - coverMeta.length * 20, width: CW, height: coverMeta.length * 20, color: C.surface });
      coverMeta.forEach(([label, val], i) => {
        const rowY = tableY - i * 20 - 14;
        page.drawText(label.toUpperCase(), { x: ML + 6, y: rowY, size: 8, font: boldFont, color: C.primary });
        page.drawText(String(val), { x: ML + colLW, y: rowY, size: 8, font, color: C.text });
        if (i > 0) {
          page.drawLine({ start: { x: ML, y: tableY - i * 20 }, end: { x: ML + CW, y: tableY - i * 20 }, thickness: 0.3, color: C.muted, opacity: 0.3 });
        }
      });

      page.drawText('DOCUMENTO GENERADO AUTOMÁTICAMENTE · SISTEMA DE GESTIÓN ACADÉMICA',
        { x: ML, y: 20, size: 7, font, color: C.muted });

      // ── CONTENT PAGES ─────────────────────────────────────────────────────
      addPage();
      y -= 8;

      const LH = 15;

      const drawText = (text, opts) => {
        const safe = cleanStr(text);
        if (!safe) return;
        page.drawText(safe, opts);
      };

      // Word-wrap aware line writer
      const writeLine = (text, {
        size = 11, f = font, color = C.text, x = ML, indent = 0,
        before = 0, after = LH, maxWidth = null,
      } = {}) => {
        const str = cleanStr(text);
        const mw = maxWidth || (CW - indent);
        if (before) y -= before;
        const words = str.split(' ');
        let buf = '';
        for (const w of words) {
          const test = buf + (buf ? ' ' : '') + w;
          if (f.widthOfTextAtSize(test, size) > mw && buf) {
            ensureSpace(size + after);
            drawText(buf, { x: x + indent, y, size, font: f, color });
            y -= LH;
            buf = w;
          } else { buf = test; }
        }
        ensureSpace(size + after);
        if (buf) drawText(buf, { x: x + indent, y, size, font: f, color });
        y -= after;
      };

      // ★ NEW: numbered list counter per nesting level
      const numCounters = { 0: 0 };

      // ── Markdown-lite parser ───────────────────────────────────────────────
      const lines = content.split('\n');
      let i = 0;
      let inCode = false;  // ★ NEW: fenced code block state

      while (i < lines.length) {
        const raw = lines[i];
        const line = raw.trimEnd();
        i++;

        // ★ NEW: fenced code block  ```...```
        if (line.trim().startsWith('```')) {
          inCode = !inCode;
          if (inCode) {
            ensureSpace(20);
            // start shaded block
            page.drawRectangle({ x: ML - 4, y: y + 4, width: CW + 8, height: 12, color: C.surface });
          } else {
            page.drawRectangle({ x: ML - 4, y: y - 6, width: CW + 8, height: 8, color: C.surface });
          }
          y -= 4;
          continue;
        }

        if (inCode) {
          ensureSpace(14);
          page.drawRectangle({ x: ML - 4, y: y - 3, width: CW + 8, height: 14, color: C.surface });
          drawText(line, { x: ML + 4, y, size: 8.5, font: monoFont, color: C.primary });
          y -= 13;
          continue;
        }

        // ★ NEW: callout / blockquote  > text
        if (line.startsWith('> ')) {
          const text = line.slice(2);
          ensureSpace(20);
          page.drawRectangle({ x: ML, y: y - 4, width: 3, height: 18, color: C.secondary });
          page.drawRectangle({ x: ML + 3, y: y - 4, width: CW - 3, height: 18, color: rgb(0.99, 0.97, 0.95) });
          writeLine(text, { x: ML + 12, indent: 0, size: 10, f: italicFont, color: C.text, before: 0, after: 12 });
          continue;
        }

        if (!line.trim()) { y -= 6; continue; }

        // --- Horizontal rule
        if (/^[-_*]{3,}$/.test(line.trim())) {
          ensureSpace(12);
          page.drawLine({
            start: { x: ML, y: y + 4 }, end: { x: PW - MR, y: y + 4 },
            thickness: 0.5, color: C.primary, opacity: 0.4,
          });
          y -= 16;
          continue;
        }

        // --- Table  |col|col|  (★ improved: configurable col widths via :N)
        if (line.startsWith('|')) {
          const tableRows = [];
          let j = i - 1;
          // ★ NEW: read optional column width hints from first separator row ":N:N:N"
          let colWidthHints = null;
          while (j < lines.length && lines[j].startsWith('|')) {
            const cells = lines[j].split('|').map(c => c.trim()).filter(Boolean);
            if (cells.every(c => /^[-:]+(\d*)$/.test(c))) {
              // parse hints like :2, :3 meaning relative weight
              colWidthHints = cells.map(c => {
                const m = c.match(/(\d+)/);
                return m ? parseInt(m[1], 10) : 1;
              });
            } else {
              tableRows.push(cells);
            }
            j++;
          }
          i = j;

          if (tableRows.length > 0) {
            const colCount = tableRows[0].length;
            const weights = colWidthHints || Array(colCount).fill(1);
            const totalW = weights.reduce((a, b) => a + b, 0);
            const colWs = weights.map(w => (w / totalW) * CW);
            const rowH = 20;

            tableRows.forEach((row, ri) => {
              const isHeader = ri === 0;
              const rowY = y - rowH;
              ensureSpace(rowH + 4);

              page.drawRectangle({
                x: ML, y: rowY, width: CW, height: rowH,
                color: isHeader ? C.primary : (ri % 2 === 0 ? C.surface : C.white),
              });

              let cx = ML;
              row.forEach((cell, ci) => {
                const cw = colWs[ci] || CW / colCount;
                const txt = cell.substring(0, 50);
                drawText(txt, {
                  x: cx + 5, y: rowY + 6, size: 8,
                  font: isHeader ? boldFont : font,
                  color: isHeader ? C.white : C.text,
                });
                if (ci > 0) {
                  page.drawLine({
                    start: { x: cx, y: rowY }, end: { x: cx, y: rowY + rowH },
                    thickness: 0.4, color: C.muted, opacity: 0.3,
                  });
                }
                cx += cw;
              });
              y = rowY;
            });

            page.drawLine({
              start: { x: ML, y }, end: { x: ML + CW, y },
              thickness: 0.5, color: C.primary, opacity: 0.4
            });
            y -= 10;
          }
          continue;
        }

        // --- H1
        if (line.startsWith('# ')) {
          const text = line.slice(2).replace(/\*\*/g, '');
          y -= 14;
          ensureSpace(32);
          // ★ IMPROVED: slightly taller badge + accent rule at bottom
          page.drawRectangle({ x: ML - 4, y: y - 6, width: CW + 8, height: 28, color: C.primary });
          page.drawRectangle({ x: ML - 4, y: y - 6, width: 4, height: 28, color: C.accent });
          drawText(text.toUpperCase(), { x: ML + 8, y: y + 4, size: 14, font: boldFont, color: C.white });
          // ★ NEW: collect TOC entry
          tocEntries.push({ level: 1, text, pageIndex: pages.length - 1 });
          y -= 34;
          continue;
        }

        // --- H2
        if (line.startsWith('## ')) {
          const text = line.slice(3).replace(/\*\*/g, '');
          y -= 10;
          ensureSpace(24);
          drawText(text, { x: ML, y, size: 12, font: boldFont, color: C.primary });
          page.drawLine({
            start: { x: ML, y: y - 3 },
            end: { x: ML + boldFont.widthOfTextAtSize(text, 12) + 4, y: y - 3 },
            thickness: 1.5, color: C.secondary,
          });
          tocEntries.push({ level: 2, text, pageIndex: pages.length - 1 });
          y -= 20;
          continue;
        }

        // --- H3
        if (line.startsWith('### ')) {
          const text = line.slice(4).replace(/\*\*/g, '');
          y -= 6;
          writeLine(text, { size: 11, f: boldFont, color: C.primary, before: 0, after: 14 });
          continue;
        }

        // --- Bullet list
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const text = line.slice(2).replace(/\*\*/g, '');
          ensureSpace(LH + 4);
          page.drawCircle({ x: ML + 6, y: y + 4, size: 2.5, color: C.secondary });
          writeLine(text, { indent: 16, before: 0, after: LH });
          continue;
        }

        // ★ IMPROVED: Numbered list — tracks counter automatically
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          numCounters[0] = (numCounters[0] || 0) + 1;
          const text = numMatch[2].replace(/\*\*/g, '');
          ensureSpace(LH + 4);
          drawText(`${numCounters[0]}.`, { x: ML + 2, y, size: 11, font: boldFont, color: C.secondary });
          writeLine(text, { indent: 20, before: 0, after: LH });
          continue;
        }

        // ★ NEW: inline key-value   **Key:** value text
        const kvMatch = line.match(/^\*\*(.+?):\*\*\s+(.*)/);
        if (kvMatch) {
          ensureSpace(LH + 6);
          const kw = boldFont.widthOfTextAtSize(kvMatch[1] + ': ', 11);
          drawText(kvMatch[1] + ': ', { x: ML, y, size: 11, font: boldFont, color: C.primary });
          writeLine(kvMatch[2], { x: ML + kw, indent: 0, size: 11, f: font, color: C.text, before: 0, after: LH + 2 });
          continue;
        }

        // --- Bold paragraph
        if (line.startsWith('**') && line.endsWith('**')) {
          writeLine(line.replace(/\*\*/g, ''), { f: boldFont, before: 2, after: LH });
          continue;
        }

        // --- Normal paragraph
        writeLine(line.replace(/\*\*/g, ''), { before: 0, after: LH });
      }

      // ★ NEW: optional Table of Contents (inserted as page 2)
      if (meta.toc && tocEntries.length > 0) {
        const tocPage = pdfDoc.insertPage(1, [PW, PH]);
        _drawPageDecor(tocPage, false);
        let ty = PH - MT - 10;

        tocPage.drawText('TABLA DE CONTENIDO', { x: ML, y: ty, size: 14, font: boldFont, color: C.primary });
        tocPage.drawLine({ start: { x: ML, y: ty - 6 }, end: { x: PW - MR, y: ty - 6 }, thickness: 1, color: C.secondary });
        ty -= 24;

        tocEntries.forEach(entry => {
          const indent = entry.level === 1 ? 0 : 20;
          const sz = entry.level === 1 ? 11 : 10;
          const f = entry.level === 1 ? boldFont : font;
          tocPage.drawText(entry.text, { x: ML + indent, y: ty, size: sz, font: f, color: C.text });
          tocPage.drawText(`${entry.pageIndex + 1}`, { x: PW - MR - 20, y: ty, size: sz, font, color: C.muted });
          tocPage.drawLine({ start: { x: ML + indent + boldFont.widthOfTextAtSize(entry.text, sz) + 4, y: ty + 3 }, end: { x: PW - MR - 24, y: ty + 3 }, thickness: 0.3, color: C.muted, opacity: 0.4 });
          ty -= sz + 8;
        });
      }

      // ── Footer on all content pages ───────────────────────────────────────
      const total = pdfDoc.getPageCount();
      pdfDoc.getPages().forEach((p, idx) => {
        if (idx === 0) return;
        const pageNum = idx;
        p.drawRectangle({ x: 8, y: 0, width: PW - 8, height: MB - 10, color: C.surface });
        p.drawLine({ start: { x: ML, y: MB - 12 }, end: { x: PW - MR, y: MB - 12 }, thickness: 0.5, color: C.primary, opacity: 0.3 });
        p.drawText(`Página ${pageNum} de ${total - 1}`,
          { x: ML, y: MB - 28, size: 8, font: italicFont, color: C.muted });
        p.drawText(meta.institution || 'Sistema de Gestión Académica',
          { x: PW - MR - 160, y: MB - 28, size: 8, font: italicFont, color: C.muted });
      });

      const pdfBytes = await pdfDoc.save();
      const fileName = `documento_${Date.now()}.pdf`;
      const filePath = outputPath || path.join(this.outputPath, fileName);
      await fs.writeFile(filePath, Buffer.from(pdfBytes));
      this.logger.info(`PDF generado: ${filePath}`);
      return { path: filePath, fileName };
    } catch (error) {
      this.logger.error('Error al generar PDF', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCX — Professional Word document v2
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Construye un DOCX profesional directamente con docx-js (sin plantillas).
   *
   * @param {string} filePath
   * @param {object} opts
   *   title        {string}
   *   subtitle     {string}
   *   meta         { institution, department, date, version }
   *   coverTable   {Array<[label, value]>}  ★ NEW: metadata on cover
   *   content      {Array}  — cada item:
   *     { type: 'h1'|'h2'|'h3'|'p'|'bullet'|'number'|'bold'|'pagebreak'
   *             |'code'|'callout'|'kv'|'divider',
   *       text,
   *       items?    (for 'code': string[]),
   *       label?    (for 'callout': badge text),
   *       key?, value?   (for 'kv') }
   *   tableData    { headers, rows, colWidths? }  ★ NEW: colWidths in DXA
   *   tables       {Array<tableData>}              ★ NEW: multiple tables
   */
  async createProfessionalDocx(filePath, opts = {}) {
    const {
      title = 'Documento', subtitle = '', content = [],
      tableData = null, tables = [], meta = {}, coverTable = [],
    } = opts;
    const C = BRAND.docx;

    // ── Numbering config ──────────────────────────────────────────────────
    const numberingConfig = [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ];

    // ── Paragraph styles ─────────────────────────────────────────────────
    const styles = {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
      paragraphStyles: [
        {
          id: 'Normal', name: 'Normal', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, font: 'Times New Roman' }, // 12pt
          paragraph: {
            spacing: { line: 360, before: 0, after: 120 }, // 1.5 line spacing (240 * 1.5 = 360)
            indent: { firstLine: 720 }, // 1.27cm (approx 720 twips)
          },
        },
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Times New Roman', color: C.primary },
          paragraph: {
            spacing: { before: 480, after: 240, line: 360 }, outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.primary, space: 4 } },
          },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 30, bold: true, font: 'Times New Roman', color: C.primary },
          paragraph: { spacing: { before: 360, after: 180, line: 360 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Times New Roman', color: C.secondary },
          paragraph: { spacing: { before: 240, after: 120, line: 360 }, outlineLevel: 2 },
        },
      ],
    };

    // ── Reusable cell builder ─────────────────────────────────────────────
    const _makeCell = (text, isHeader, isAlt = false, colW = 1500) => {
      const border = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
      const borders = { top: border, bottom: border, left: border, right: border };
      const cell = new TableCell({
        borders,
        width: { size: colW, type: WidthType.DXA },
        shading: {
          fill: isHeader ? C.tableHead : (isAlt ? C.tableAlt : C.white),
          type: ShadingType.CLEAR,
        },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({
            text: String(text || ''),
            bold: isHeader,
            size: isHeader ? 20 : 18,
            color: isHeader ? C.white : C.text,
            font: 'Times New Roman',
          })],
          spacing: { before: 40, after: 40 },
        })],
      });
      return cell;
    };

    // ── Table builder (supports custom colWidths) ─────────────────────────
    const _buildTable = (td) => {
      if (!td?.headers?.length) return [];
      const colCount = td.headers.length;
      const totalW = 9026; // A4 content width in DXA
      // ★ NEW: accept custom column widths, fallback to equal split
      const colWidths = td.colWidths && td.colWidths.length === colCount
        ? td.colWidths
        : Array(colCount).fill(Math.floor(totalW / colCount));

      return [new Table({
        width: { size: totalW, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [
          new TableRow({
            tableHeader: true,
            children: td.headers.map((h, ci) => _makeCell(h, true, false, colWidths[ci])),
          }),
          ...(td.rows || []).map((row, ri) =>
            new TableRow({
              children: row.map((cell, ci) => _makeCell(cell, false, ri % 2 !== 0, colWidths[ci])),
            })
          ),
        ],
      }),
      new Paragraph({ spacing: { before: 120, after: 120 } }),  // spacer
      ];
    };

    // ── Header ────────────────────────────────────────────────────────────
    const docHeader = new Header({
      children: [new Paragraph({
        children: [
          new TextRun({ text: (meta.institution || 'FIIS-UNAS').toUpperCase(), bold: true, color: C.primary, size: 16, font: 'Times New Roman' }),
          new TextRun({ text: '  ·  ', color: C.muted, size: 16 }),
          new TextRun({ text: title, color: C.muted, size: 16, italics: true }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.primary, space: 4 } },
      })],
    });

    // ── Footer ────────────────────────────────────────────────────────────
    const docFooter = new Footer({
      children: [new Paragraph({
        children: [
          new TextRun({ text: meta.department || 'Sistema de Gestión Académica', color: C.muted, size: 14, italics: true }),
          new TextRun({ text: '\t' }),
          new TextRun({ text: 'Página ', color: C.muted, size: 14 }),
          new TextRun({ children: [PageNumber.CURRENT], color: C.muted, size: 14 }),
          new TextRun({ text: ' de ', color: C.muted, size: 14 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: C.muted, size: 14 }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.primary, space: 4 } },
      })],
    });

    // ── ★ NEW: Cover / title block ────────────────────────────────────────
    // A banner table (1-cell) gives a solid coloured header bar
    const _makeBannerTable = (text) => new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [9026],
      rows: [new TableRow({
        children: [new TableCell({
          shading: { fill: C.primary, type: ShadingType.CLEAR },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text, bold: true, size: 36, color: C.white, font: 'Times New Roman' })],
          })],
        })],
      })],
    });

    const titleBlock = [
      // ★ NEW: coloured top banner
      _makeBannerTable(title),
      new Paragraph({ spacing: { before: 0, after: 80 } }),  // gap

      // Subtitle
      ...(subtitle ? [new Paragraph({
        children: [new TextRun({ text: subtitle, size: 24, color: C.muted, italics: true, font: 'Times New Roman' })],
        spacing: { before: 0, after: 60 },
      })] : []),

      // Date + version chips
      ...((meta.date || meta.version) ? [new Paragraph({
        children: [
          ...(meta.date ? [new TextRun({
            text: ` ${meta.date} `, size: 18, color: C.white,
            shading: { fill: C.primary, type: ShadingType.CLEAR }
          })] : []),
          ...(meta.version ? [new TextRun({
            text: `  v${meta.version}  `, size: 18, color: C.white,
            shading: { fill: C.secondary, type: ShadingType.CLEAR }
          })] : []),
        ],
        spacing: { before: 60, after: 80 },
      })] : []),

      // ★ NEW: metadata key-value table on cover (e.g. institution, responsable)
      ...(coverTable.length > 0 ? [
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [3000, 6026],
          rows: coverTable.map(([lbl, val], ri) => new TableRow({
            children: [
              new TableCell({
                shading: { fill: ri % 2 === 0 ? C.surface : 'FFFFFF', type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: lbl, bold: true, size: 18, color: C.primary, font: 'Times New Roman' })],
                })],
              }),
              new TableCell({
                shading: { fill: ri % 2 === 0 ? C.surface : 'FFFFFF', type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: String(val), size: 18, color: C.text, font: 'Times New Roman' })],
                })],
              }),
            ],
          })),
        }),
        new Paragraph({ spacing: { before: 0, after: 240 } }),
      ] : []),

      // Accent divider rule
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.secondary, space: 8 } },
        spacing: { before: 0, after: 480 },
      }),
    ];

    // ── Content builder ───────────────────────────────────────────────────
    const buildContent = (items) => {
      const out = [];
      for (const item of items) {
        switch (item.type) {

          // Standard headings
          case 'h1':
            out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(item.text)] }));
            break;
          case 'h2':
            out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(item.text)] }));
            break;
          case 'h3':
            out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(item.text)] }));
            break;

          // Body text
          case 'p':
            out.push(new Paragraph({
              children: [new TextRun({ text: item.text, size: 22, font: 'Times New Roman' })],
              alignment: AlignmentType.JUSTIFY,
              spacing: { before: 0, after: 120 },
            }));
            break;

          // Lists
          case 'bullet':
            out.push(new Paragraph({
              numbering: { reference: 'bullets', level: 0 },
              children: [new TextRun({ text: item.text, size: 22, font: 'Times New Roman' })],
              spacing: { before: 40, after: 40 },
            }));
            break;
          case 'number':
            out.push(new Paragraph({
              numbering: { reference: 'numbers', level: 0 },
              children: [new TextRun({ text: item.text, size: 22, font: 'Times New Roman' })],
              spacing: { before: 40, after: 40 },
            }));
            break;

          // Bold / emphasis
          case 'bold':
            out.push(new Paragraph({
              children: [new TextRun({ text: item.text, bold: true, size: 22, font: 'Times New Roman' })],
              spacing: { before: 160, after: 80 },
            }));
            break;

          // Page break
          case 'pagebreak':
            out.push(new Paragraph({ children: [new PageBreak()] }));
            break;

          // ★ NEW: horizontal divider
          case 'divider':
            out.push(new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.muted, space: 4 } },
              spacing: { before: 120, after: 120 },
            }));
            break;

          // ★ NEW: inline key–value  e.g. "Docente: Dr. Juan Pérez"
          case 'kv': {
            const key = item.key || '';
            const val = item.value || item.text || '';
            out.push(new Paragraph({
              children: [
                new TextRun({ text: `${key}: `, bold: true, size: 22, color: C.primary, font: 'Times New Roman' }),
                new TextRun({ text: val, size: 22, font: 'Times New Roman' }),
              ],
              spacing: { before: 40, after: 60 },
            }));
            break;
          }

          // ★ NEW: code block (monospaced, shaded background)
          case 'code': {
            const codeLines = Array.isArray(item.items)
              ? item.items
              : (item.text || '').split('\n');
            // Spacer + shaded container via single-column table
            out.push(new Table({
              width: { size: 9026, type: WidthType.DXA },
              columnWidths: [9026],
              rows: [new TableRow({
                children: [new TableCell({
                  shading: { fill: C.codeBlock, type: ShadingType.CLEAR },
                  margins: { top: 120, bottom: 120, left: 200, right: 200 },
                  children: codeLines.map(cl => new Paragraph({
                    children: [new TextRun({ text: cl || ' ', size: 18, font: 'Courier New', color: C.codeFg })],
                    spacing: { before: 0, after: 20 },
                  })),
                })],
              })],
            }));
            out.push(new Paragraph({ spacing: { before: 0, after: 120 } }));
            break;
          }

          // ★ NEW: callout box with left badge and shaded background
          case 'callout': {
            const label = item.label || 'NOTA';
            const calloutText = item.text || '';
            out.push(new Table({
              width: { size: 9026, type: WidthType.DXA },
              columnWidths: [800, 8226],
              rows: [new TableRow({
                children: [
                  // Left badge cell
                  new TableCell({
                    shading: { fill: C.primary, type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 100, right: 100 },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: label, bold: true, size: 16, color: C.white, font: 'Times New Roman' })],
                    })],
                  }),
                  // Text cell
                  new TableCell({
                    shading: { fill: C.surface, type: ShadingType.CLEAR },
                    margins: { top: 100, bottom: 100, left: 160, right: 120 },
                    children: [new Paragraph({
                      children: [new TextRun({ text: calloutText, size: 20, font: 'Times New Roman', italics: true })],
                    })],
                  }),
                ],
              })],
            }));
            out.push(new Paragraph({ spacing: { before: 0, after: 120 } }));
            break;
          }

          // Inline table (within content array)
          case 'table':
            if (item.data) out.push(..._buildTable(item.data));
            break;

          default:
            out.push(new Paragraph({
              children: [new TextRun({ text: item.text || '', size: 22, font: 'Times New Roman' })],
              spacing: { before: 0, after: 120 },
            }));
        }
      }
      return out;
    };

    // ── Assemble document ─────────────────────────────────────────────────
    const doc = new Document({
      numbering: { config: numberingConfig },
      styles,
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1701, right: 1134, bottom: 1134, left: 1701 },
          },
        },
        headers: { default: docHeader },
        footers: { default: docFooter },
        children: [
          ...titleBlock,
          ...buildContent(content),
          // Single table (legacy API)
          ...(tableData ? _buildTable(tableData) : []),
          // ★ NEW: multiple tables
          ...tables.flatMap(td => _buildTable(td)),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // generateSyllabus — Sílabo académico DOCX
  // ─────────────────────────────────────────────────────────────────────────
  async generateSyllabus(data) {
    try {
      await this.initialize();
      const { course_code, course_name, professor, semester, content = '' } = data;
      const fileName = `silabo_${course_code}_${Date.now()}.docx`;
      const filePath = path.join(this.outputPath, fileName);

      const contentItems = content.split('\n').filter(Boolean).map(line => {
        if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2) };
        if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3) };
        if (line.startsWith('- ')) return { type: 'bullet', text: line.slice(2) };
        return { type: 'p', text: line };
      });

      await this.createProfessionalDocx(filePath, {
        title: `SÍLABO — ${course_name}`,
        subtitle: `${course_code}  ·  ${professor}  ·  Semestre ${semester}`,
        // ★ NEW: rich cover metadata table
        coverTable: [
          ['Código del Curso', course_code],
          ['Nombre del Curso', course_name],
          ['Docente Responsable', professor],
          ['Semestre Académico', semester],
          ['Institución', 'UNAS · FIIS'],
          ['Fecha de Emisión', new Date().toLocaleDateString('es-PE')],
        ],
        content: contentItems,
        meta: {
          institution: 'UNAS · FIIS',
          department: 'Facultad de Ingeniería en Informática y Sistemas',
          date: new Date().toLocaleDateString('es-PE'),
        },
      });

      return { path: filePath, fileName };
    } catch (error) {
      this.logger.error('Error al generar sílabo', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // generateResolution — Resolución administrativa DOCX
  // ─────────────────────────────────────────────────────────────────────────
  async generateResolution(data) {
    try {
      await this.initialize();
      const { type, subject, content, date = new Date().toLocaleDateString('es-PE') } = data;
      const resNum = `XXX-${new Date().getFullYear()}-UNAS/FIIS`;
      const fileName = `resolucion_${type}_${Date.now()}.docx`;
      const filePath = path.join(this.outputPath, fileName);

      await this.createProfessionalDocx(filePath, {
        title: `RESOLUCIÓN ${type.toUpperCase()} Nº ${resNum}`,
        subtitle: subject,
        // ★ NEW: cover metadata
        coverTable: [
          ['Tipo de Resolución', type.toUpperCase()],
          ['Número', resNum],
          ['Asunto', subject],
          ['Fecha', date],
          ['Institución', 'UNAS · FIIS — Decanato'],
        ],
        content: [
          { type: 'h2', text: 'VISTO' },
          { type: 'p', text: content },
          { type: 'divider' },                       // ★ NEW
          { type: 'h2', text: 'CONSIDERANDO' },
          { type: 'p', text: 'Que, es función de esta Dirección velar por el cumplimiento de los fines y objetivos institucionales.' },
          { type: 'divider' },                       // ★ NEW
          { type: 'h2', text: 'SE RESUELVE' },
          { type: 'bold', text: `Artículo 1°.— [Contenido de la resolución]` },
          // ★ NEW: callout for firma
          { type: 'callout', label: 'FIRMA', text: `Regístrese, comuníquese y archívese. Dado en Tingo María, ${date}.` },
        ],
        meta: { institution: 'UNAS', department: 'FIIS · Decanato', date },
      });

      return { path: filePath, fileName };
    } catch (error) {
      this.logger.error('Error al generar resolución', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCEL — Professional spreadsheet with branding
  // ═══════════════════════════════════════════════════════════════════════════
  async generateExcel(data) {
    try {
      await this.initialize();
      const {
        title, headers = [], rows = [],
        sheetName = 'Reporte', summaryRow = null,
        // ★ NEW: optional extra sheets
        extraSheets = [],
      } = data;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Gestión Académica';
      workbook.created = new Date();

      const _buildSheet = (ws, shTitle, shHeaders, shRows, shSummary) => {
        ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true };
        ws.views = [{ state: 'frozen', ySplit: 3 }];

        const P = BRAND.docx;
        const colCount = Math.max(shHeaders.length, 1);

        ws.columns = shHeaders.map((h) => ({
          key: String(h).replace(/\s+/g, '_').toLowerCase(),
          width: Math.max(String(h).length + 4, 18),
        }));

        // Row 1: Title
        ws.mergeCells(1, 1, 1, colCount);
        const titleCell = ws.getCell(1, 1);
        titleCell.value = shTitle || 'Reporte';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF' + P.primary } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2FA' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(1).height = 32;

        // Row 2: Metadata
        ws.mergeCells(2, 1, 2, colCount);
        const metaCell = ws.getCell(2, 1);
        metaCell.value = `Generado el ${new Date().toLocaleString('es-PE')} · Sistema de Gestión Académica`;
        metaCell.font = { italic: true, size: 9, color: { argb: 'FF' + P.muted } };
        metaCell.alignment = { horizontal: 'left', indent: 1 };
        ws.getRow(2).height = 18;

        // Row 3: Headers
        if (shHeaders.length > 0) {
          const headerRow = ws.addRow(shHeaders);
          headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + P.primary } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { bottom: { style: 'medium', color: { argb: 'FF' + P.secondary } } };
          });
          headerRow.height = 24;
        }

        // Data rows
        shRows.forEach((row, ri) => {
          const dataRow = ws.addRow(row);
          dataRow.eachCell((cell, ci) => {
            cell.font = { size: 10 };
            cell.fill = {
              type: 'pattern', pattern: 'solid',
              fgColor: { argb: ri % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FC' },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = {
              bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
              right: ci === colCount ? { style: 'thin', color: { argb: 'FFDDDDDD' } } : undefined,
            };
          });
          dataRow.height = 20;
        });

        // Summary row
        if (shSummary) {
          const sumRow = ws.addRow(shSummary);
          sumRow.eachCell(cell => {
            cell.font = { bold: true, size: 10, color: { argb: 'FF' + P.primary } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F2FA' } };
            cell.border = { top: { style: 'medium', color: { argb: 'FF' + P.primary } } };
            cell.alignment = { vertical: 'middle' };
          });
          sumRow.height = 22;
        }

        // Auto-fit widths
        ws.columns.forEach((col, ci) => {
          let maxLen = shHeaders[ci] ? String(shHeaders[ci]).length : 10;
          shRows.forEach(row => { if (row[ci]) maxLen = Math.max(maxLen, String(row[ci]).length); });
          col.width = Math.min(Math.max(maxLen + 4, 12), 50);
        });
      };

      // Main sheet
      const ws = workbook.addWorksheet(sheetName, {});
      _buildSheet(ws, title, headers, rows, summaryRow);

      // ★ NEW: extra sheets
      for (const es of extraSheets) {
        const ws2 = workbook.addWorksheet(es.sheetName || 'Hoja');
        _buildSheet(ws2, es.title || es.sheetName, es.headers || [], es.rows || [], es.summaryRow || null);
      }

      const fileName = `reporte_${Date.now()}.xlsx`;
      const filePath = path.join(this.outputPath, fileName);
      await workbook.xlsx.writeFile(filePath);
      this.logger.info(`Excel generado: ${filePath}`);
      return { path: filePath, fileName };
    } catch (error) {
      this.logger.error('Error al generar Excel', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POWERPOINT — Professional presentation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @param {object} data
   *   title, subtitle, slides, meta
   *   slides: [{ title, content, bullets?, table?, layout?,
   *              icon?     ★ NEW: emoji/text icon on slide header
   *              note?     ★ NEW: speaker note
   *              accent?   ★ NEW: override accent colour for this slide }]
   *   layout: 'bullets' | 'two-col' | 'table' | 'blank' | 'stat'  ★ NEW stat
   */
  async generatePPT(data) {
    try {
      await this.initialize();
      const { title, subtitle = '', slides = [], meta = {} } = data;
      const pres = new PptxGenJS();
      const C = BRAND.pptx;

      pres.layout = 'LAYOUT_WIDE';
      pres.author = meta.institution || 'FIIS-UNAS';
      pres.subject = title;

      // ── Cover slide ───────────────────────────────────────────────────
      const cover = pres.addSlide();
      cover.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '55%', h: '100%', fill: { color: C.primary } });
      cover.addShape(pres.ShapeType.rect, { x: '55%', y: 0, w: '45%', h: '100%', fill: { color: C.surface } });
      cover.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: C.secondary } });
      // ★ NEW: horizontal accent rule
      cover.addShape(pres.ShapeType.rect, { x: 0.35, y: 3.6, w: 5.8, h: 0.04, fill: { color: C.accent } });

      cover.addText(title, { x: 0.35, y: 1.2, w: 6.5, h: 2.2, fontSize: 36, bold: true, color: C.light, fontFace: 'Calibri', align: 'left', valign: 'middle', wrap: true });
      if (subtitle) {
        cover.addText(subtitle, { x: 0.35, y: 3.75, w: 6.5, h: 0.8, fontSize: 18, color: C.light, italic: true, fontFace: 'Calibri', align: 'left' });
      }

      const infoLines = [meta.institution, meta.department, meta.date || new Date().toLocaleDateString('es-PE')].filter(Boolean);
      cover.addText(infoLines.join('\n'), { x: '57%', y: 2.5, w: '40%', h: 2, fontSize: 14, color: C.muted, align: 'left', wrap: true });

      // ── Content slides ────────────────────────────────────────────────
      slides.forEach((s, si) => {
        const sl = pres.addSlide();
        const accentColor = s.accent || C.secondary;

        // Header bar
        sl.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.1, fill: { color: C.primary } });
        // ★ NEW: bottom accent rule on header bar
        sl.addShape(pres.ShapeType.rect, { x: 0, y: 1.06, w: '100%', h: 0.04, fill: { color: accentColor } });

        // Slide number badge
        sl.addShape(pres.ShapeType.ellipse, { x: 12.1, y: 0.2, w: 0.5, h: 0.5, fill: { color: accentColor } });
        sl.addText(String(si + 1), { x: 12.1, y: 0.2, w: 0.5, h: 0.5, fontSize: 11, bold: true, color: C.light, align: 'center', valign: 'middle' });

        // ★ NEW: optional icon before title
        const iconText = s.icon ? `${s.icon}  ${s.title || ''}` : (s.title || '');
        sl.addText(iconText, { x: 0.3, y: 0.05, w: 11.5, h: 1.0, fontSize: 22, bold: true, color: C.light, align: 'left', valign: 'middle' });

        const layout = s.layout || (s.bullets ? 'bullets' : s.table ? 'table' : 'content');

        // ── Table layout ──
        if (layout === 'table' && s.table) {
          const { headers = [], rows = [] } = s.table;
          const tableData = [
            headers.map(h => ({ text: h, options: { bold: true, color: C.light, fill: C.primary, align: 'center' } })),
            ...rows.map((row, ri) => row.map(cell => ({
              text: String(cell || ''),
              options: { fill: ri % 2 === 0 ? 'FFFFFF' : C.surface, align: 'center', fontSize: 11 },
            }))),
          ];
          sl.addTable(tableData, { x: 0.3, y: 1.3, w: 12.4, h: 5, colW: Array(headers.length).fill(12.4 / headers.length), border: { pt: 0.5, color: 'DDDDDD' }, fontSize: 11 });

          // ── Two-column layout ──
        } else if (layout === 'two-col' && s.columns) {
          const [left, right] = s.columns;
          sl.addText(left.title || '', { x: 0.3, y: 1.3, w: 5.8, h: 0.5, fontSize: 14, bold: true, color: C.primary });
          sl.addText(left.text || (left.bullets || []).join('\n'), { x: 0.3, y: 1.9, w: 5.8, h: 4.2, fontSize: 13, color: C.text, wrap: true });
          sl.addShape(pres.ShapeType.line, { x: 6.5, y: 1.3, w: 0, h: 4.8, line: { color: accentColor, width: 1.5 } });
          sl.addText(right.title || '', { x: 6.7, y: 1.3, w: 5.8, h: 0.5, fontSize: 14, bold: true, color: C.primary });
          sl.addText(right.text || (right.bullets || []).join('\n'), { x: 6.7, y: 1.9, w: 5.8, h: 4.2, fontSize: 13, color: C.text, wrap: true });

          // ★ NEW: stat/metrics layout — big numbers
        } else if (layout === 'stat' && s.stats) {
          const stats = s.stats.slice(0, 4); // max 4 stats
          const w = 12.6 / stats.length;
          stats.forEach((stat, si2) => {
            const x = 0.3 + si2 * w;
            sl.addShape(pres.ShapeType.rect, { x, y: 1.5, w: w - 0.15, h: 3.8, fill: { color: si2 % 2 === 0 ? C.primary : C.surface } });
            sl.addText(String(stat.value || ''), { x, y: 2.0, w: w - 0.15, h: 1.6, fontSize: 44, bold: true, color: si2 % 2 === 0 ? C.light : C.primary, align: 'center', valign: 'middle' });
            sl.addText(String(stat.label || ''), { x, y: 3.6, w: w - 0.15, h: 1.0, fontSize: 13, color: si2 % 2 === 0 ? C.light : C.muted, align: 'center', wrap: true });
          });

          // ── Standard bullets/content ──
        } else {
          const items = s.bullets || (s.content ? s.content.split('\n') : []);
          const bulletLines = items.map(bp => ({
            text: bp,
            options: { bullet: { indent: 15 }, fontSize: 14, paraSpaceAfter: 8 },
          }));
          if (bulletLines.length > 0) {
            sl.addText(bulletLines, { x: 0.3, y: 1.3, w: 12.0, h: 5.2, color: C.text, valign: 'top', wrap: true });
          } else if (s.content) {
            sl.addText(s.content, { x: 0.3, y: 1.3, w: 12.0, h: 5.2, fontSize: 14, color: C.text, wrap: true, valign: 'top' });
          }
        }

        // Footer bar
        sl.addShape(pres.ShapeType.rect, { x: 0, y: 6.6, w: '100%', h: 0.4, fill: { color: C.surface } });
        sl.addText(meta.institution || 'FIIS-UNAS', { x: 0.3, y: 6.62, w: 6, h: 0.36, fontSize: 9, color: C.muted, italic: true });
        sl.addText(`${si + 1} / ${slides.length}`, { x: 12, y: 6.62, w: 0.7, h: 0.36, fontSize: 9, color: C.muted, align: 'right' });

        // ★ NEW: speaker notes
        if (s.note) sl.addNotes(s.note);
      });

      // ── Closing slide ─────────────────────────────────────────────────
      const end = pres.addSlide();
      end.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: C.primary } });
      end.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: '100%', fill: { color: C.secondary } });
      // ★ NEW: accent diamond
      end.addShape(pres.ShapeType.rect, { x: '35%', y: '45%', w: 1.5, h: 0.06, fill: { color: C.accent } });
      end.addText('¡Gracias!', { x: 1, y: 2.0, w: 11, h: 1.5, fontSize: 48, bold: true, color: C.light, align: 'center' });
      end.addText(meta.institution || '', { x: 1, y: 3.7, w: 11, h: 0.6, fontSize: 18, color: C.light, align: 'center', transparency: 30 });
      if (meta.date) end.addText(meta.date, { x: 1, y: 4.4, w: 11, h: 0.5, fontSize: 13, color: C.light, align: 'center', transparency: 50 });

      const fileName = `presentacion_${Date.now()}.pptx`;
      const filePath = path.join(this.outputPath, fileName);
      await pres.writeFile({ fileName: filePath });
      this.logger.info(`PPT generado: ${filePath}`);
      return { path: filePath, fileName };
    } catch (error) {
      this.logger.error('Error al generar PPT', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // generateAcademicDocument — Tesis, Proyectos y Artículos UNAS
  // ─────────────────────────────────────────────────────────────────────────
  async generateAcademicDocument(data) {
    try {
      await this.initialize();
      const { type, title, context, professor, student, date = new Date().toLocaleDateString('es-PE') } = data;
      const fileName = `${type}_${Date.now()}.docx`;
      const filePath = path.join(this.outputPath, fileName);

      // Map categories to professional cover table keys
      const coverTable = [
        ['Institución', 'UNIVERSIDAD NACIONAL AGRARIA DE LA SELVA'],
        ['Facultad', 'FACULTAD DE INGENIERÍA EN INFORMÁTICA Y SISTEMAS'],
        ['Escuela', 'ESCUELA PROFESIONAL DE INGENIERÍA EN INFORMÁTICA Y SISTEMAS'],
        ['Proyecto', title],
        student ? ['Practicante', student] : null,
        professor ? ['Asesor/Autor', professor] : null,
        ['Fecha', date],
      ].filter(Boolean);

      const contentItems = context.split('\n').filter(Boolean).map(line => {
        if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2) };
        if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3) };
        if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4) };
        if (line.startsWith('- ')) return { type: 'bullet', text: line.slice(2) };
        if (line.match(/^\d+\./)) return { type: 'number', text: line.replace(/^\d+\.\s+/, '') };
        return { type: 'p', text: line };
      });

      await this.createProfessionalDocx(filePath, {
        title: title.toUpperCase(),
        subtitle: type.toUpperCase(),
        coverTable,
        content: contentItems,
        meta: {
          institution: 'UNAS · FIIS',
          department: 'EPIIS',
          date,
        },
      });

      return { path: filePath, fileName };
    } catch (error) {
      this.logger.error('Error al generar documento académico', error);
      throw error;
    }
  }

  /**
   * Generar un documento de examen profesional (PDF/DOCX) con formato universitario oficial
   * Replica el formato de examen de la UNAS con encabezado centrado, preguntas numeradas,
   * opciones A-E con respuestas correctas resaltadas en magenta, y numeración de páginas.
   */
  async generateExamDocument(examData, format = 'pdf') {
    try {
      await this.initialize();
      const { header = {}, instructions, questions = [] } = examData;

      // Defaults seguros
      const institution = header.institution || 'UNIVERSIDAD NACIONAL AGRARIA DE LA SELVA';
      const faculty = header.faculty || 'FACULTAD DE INGENIERÍA EN INFORMÁTICA Y SISTEMAS';
      const examType = header.examType || 'EXAMEN PARCIAL';
      const course = header.course || 'Curso';
      const semester = header.semester || `${new Date().getFullYear()}-I`;
      const examDate = header.date || new Date().toLocaleDateString('es-PE');
      const duration = header.duration || '60';
      const pointsPerQuestion = header.pointsPerQuestion || 2;
      const examTitle = `${examType} DE ${course.toUpperCase()} - ${semester}`;

      const fileName = `examen_${Date.now()}.${format}`;
      const filePath = path.join(this.outputPath, fileName);

      const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      if (format === 'pdf') {
        // ══════════════════════════════════════════════════════════════════
        // PDF — Formato universitario oficial sin portada decorativa
        // ══════════════════════════════════════════════════════════════════
        const pdfDoc = await PDFDocument.create();
        const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
        const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

        const PW = 595.28, PH = 841.89;
        const ML = 56, MR = 56, MT = 50, MB = 60;
        const CW = PW - ML - MR;

        const COLOR = {
          black: rgb(0, 0, 0),
          blue: rgb(0.0, 0.0, 0.7),
          magenta: rgb(0.8, 0.0, 0.5),
          gray: rgb(0.3, 0.3, 0.3),
          lightGray: rgb(0.92, 0.92, 0.92),
          white: rgb(1, 1, 1),
        };

        let page = null;
        let y = 0;
        const pages = [];

        const addPage = () => {
          page = pdfDoc.addPage([PW, PH]);
          pages.push(page);
          y = PH - MT;
          return page;
        };

        const ensureSpace = (needed = 20) => {
          if (y - needed < MB + 10) { addPage(); }
        };

        // Helper: draw centered text
        const drawCentered = (text, { size = 11, font = fontRegular, color = COLOR.black, yPos = null } = {}) => {
          const textWidth = font.widthOfTextAtSize(text, size);
          const xPos = (PW - textWidth) / 2;
          const drawY = yPos !== null ? yPos : y;
          page.drawText(text, { x: xPos, y: drawY, size, font, color });
          if (yPos === null) y -= size + 4;
        };

        // Helper: word-wrap text
        const wrapText = (text, font, size, maxWidth) => {
          const words = text.split(' ');
          const lines = [];
          let currentLine = '';
          for (const word of words) {
            const test = currentLine + (currentLine ? ' ' : '') + word;
            if (font.widthOfTextAtSize(test, size) > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = test;
            }
          }
          if (currentLine) lines.push(currentLine);
          return lines;
        };

        // Sanitiza texto para pdf-lib
        const clean = (s) => (s || '').replace(/[^\x20-\x7E\u00A0-\u024F\r\n\t]/g, '');

        // ── PRIMERA PÁGINA ──────────────────────────────────────────────
        addPage();

        // Encabezado centrado
        drawCentered(clean(institution), { size: 11, font: fontBold });
        drawCentered(clean(faculty), { size: 10, font: fontBold });
        y -= 4;
        drawCentered(clean(examTitle), { size: 11, font: fontBold, color: COLOR.blue });
        y -= 8;

        // Línea separadora
        page.drawLine({
          start: { x: ML, y }, end: { x: PW - MR, y },
          thickness: 1, color: COLOR.black,
        });
        y -= 14;

        // Fecha y duración
        const dateText = `Fecha: ${clean(examDate)}`;
        const durationText = `Tiempo de duracion: ${clean(duration)} min.`;
        page.drawText(dateText, { x: ML, y, size: 10, font: fontBold, color: COLOR.black });
        const durWidth = fontBold.widthOfTextAtSize(durationText, 10);
        page.drawText(durationText, { x: PW - MR - durWidth, y, size: 10, font: fontBold, color: COLOR.black });
        y -= 16;

        // Nombre del alumno
        page.drawText('Nombres y apellidos:', { x: ML, y, size: 10, font: fontBold, color: COLOR.black });
        page.drawLine({
          start: { x: ML + 130, y: y - 2 }, end: { x: PW - MR, y: y - 2 },
          thickness: 0.5, color: COLOR.gray,
        });
        y -= 14;

        // Línea separadora
        page.drawLine({
          start: { x: ML, y }, end: { x: PW - MR, y },
          thickness: 0.5, color: COLOR.gray,
        });
        y -= 6;

        // Indicaciones
        if (instructions) {
          const instrText = `INDICACIONES: ${clean(instructions)}`;
          const instrLines = wrapText(instrText, fontBoldItalic, 8.5, CW);

          // Fondo gris para indicaciones
          const instrHeight = instrLines.length * 12 + 8;
          page.drawRectangle({
            x: ML, y: y - instrHeight + 4, width: CW, height: instrHeight,
            color: COLOR.lightGray,
          });

          for (const line of instrLines) {
            page.drawText(line, { x: ML + 4, y: y - 6, size: 8.5, font: fontBoldItalic, color: COLOR.black });
            y -= 12;
          }
          y -= 8;
        }

        // ── PREGUNTAS ───────────────────────────────────────────────────
        questions.forEach((q, idx) => {
          const qNum = idx + 1;
          const points = q.points || pointsPerQuestion;

          // Calcular espacio necesario
          let spaceNeeded = 30;
          if (q.options) spaceNeeded += q.options.length * 16;
          if (q.type === 'true_false') spaceNeeded += 32;
          if (q.type === 'open_ended' || q.type === 'fill_blank') spaceNeeded += 40;
          ensureSpace(spaceNeeded);

          y -= 6;

          // Número de pregunta + texto + puntaje
          const qText = clean(q.question || '');
          const pointsText = ` (${points} PUNTOS)`;
          const prefix = `${qNum}    `;

          // Dibujar número de pregunta en negrita
          page.drawText(`${qNum}`, { x: ML, y, size: 11, font: fontBold, color: COLOR.black });

          // Wrap del texto de pregunta
          const qStartX = ML + 24;
          const qMaxWidth = CW - 24;
          const fullQText = qText;
          const qLines = wrapText(fullQText, fontBold, 10, qMaxWidth - fontBold.widthOfTextAtSize(pointsText, 10) - 4);

          if (qLines.length === 1) {
            // Pregunta + puntaje en la misma línea
            page.drawText(clean(qLines[0]), { x: qStartX, y, size: 10, font: fontBold, color: COLOR.black });
            const qLineWidth = fontBold.widthOfTextAtSize(qLines[0], 10);
            page.drawText(pointsText, { x: qStartX + qLineWidth + 2, y, size: 10, font: fontBold, color: COLOR.black });
            y -= 16;
          } else {
            // Multi-línea: última línea tiene el puntaje
            for (let li = 0; li < qLines.length; li++) {
              page.drawText(clean(qLines[li]), { x: qStartX, y, size: 10, font: fontBold, color: COLOR.black });
              if (li === qLines.length - 1) {
                const lineW = fontBold.widthOfTextAtSize(qLines[li], 10);
                page.drawText(pointsText, { x: qStartX + lineW + 2, y, size: 10, font: fontBold, color: COLOR.black });
              }
              y -= 14;
            }
            y -= 2;
          }

          // Opciones
          if ((q.type === 'multiple_choice' || q.type === 'multi_select') && q.options) {
            const correctAnswers = Array.isArray(q.correct) ? q.correct : [q.correct];
            q.options.forEach((opt, oi) => {
              const letter = LETTERS[oi] || String.fromCharCode(65 + oi);
              const isCorrect = correctAnswers.includes(letter);
              const optColor = isCorrect ? COLOR.magenta : COLOR.black;
              const optFont = isCorrect ? fontBold : fontRegular;

              ensureSpace(16);
              const optText = `${letter}.  ${clean(String(opt).replace(/^[A-Z]\)\s*/, ''))}`;
              page.drawText(optText, { x: ML + 48, y, size: 10, font: optFont, color: optColor });
              y -= 15;
            });
          } else if (q.type === 'true_false') {
            const correctVal = String(q.correct || '').toLowerCase();
            ['Verdadero', 'Falso'].forEach((opt, oi) => {
              const letter = LETTERS[oi];
              const isCorrect = (oi === 0 && correctVal === 'verdadero') || (oi === 1 && correctVal === 'falso');
              const optColor = isCorrect ? COLOR.magenta : COLOR.black;
              const optFont = isCorrect ? fontBold : fontRegular;

              ensureSpace(16);
              page.drawText(`${letter}.  ${opt}`, { x: ML + 48, y, size: 10, font: optFont, color: optColor });
              y -= 15;
            });
          } else if (q.type === 'fill_blank') {
            ensureSpace(20);
            page.drawLine({
              start: { x: ML + 48, y: y - 2 }, end: { x: ML + 48 + 300, y: y - 2 },
              thickness: 0.5, color: COLOR.gray,
            });
            y -= 20;
          } else if (q.type === 'open_ended') {
            ensureSpace(36);
            for (let li = 0; li < 3; li++) {
              page.drawLine({
                start: { x: ML + 24, y: y - 2 }, end: { x: PW - MR, y: y - 2 },
                thickness: 0.3, color: COLOR.gray,
              });
              y -= 18;
            }
          }

          y -= 4;
        });

        // ── FOOTER: Número de página ──────────────────────────────────
        const totalPages = pdfDoc.getPageCount();
        pdfDoc.getPages().forEach((p, idx) => {
          const pageNumText = `${idx + 1}`;
          const numWidth = fontRegular.widthOfTextAtSize(pageNumText, 10);
          p.drawText(pageNumText, { x: (PW - numWidth) / 2, y: 25, size: 10, font: fontRegular, color: COLOR.black });
        });

        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(filePath, Buffer.from(pdfBytes));
        this.logger.info(`Examen PDF generado: ${filePath}`);
        return { path: filePath, fileName };

      } else {
        // ══════════════════════════════════════════════════════════════════
        // DOCX — Formato universitario oficial
        // ══════════════════════════════════════════════════════════════════
        const C = BRAND.docx;

        const numberingConfig = [{
          reference: 'questions',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360, hanging: 360 } } },
          }],
        }];

        const docChildren = [];

        // Encabezado centrado
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: institution, bold: true, size: 22, font: 'Times New Roman' })],
        }));
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: faculty, bold: true, size: 20, font: 'Times New Roman' })],
        }));
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: examTitle, bold: true, size: 22, font: 'Times New Roman', color: '0000B3' })],
        }));

        // Línea separadora
        docChildren.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } },
          spacing: { after: 120 },
        }));

        // Fecha y duración en tabla de 2 columnas
        docChildren.push(new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [4513, 4513],
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
          rows: [new TableRow({
            children: [
              new TableCell({
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Fecha: ', bold: true, size: 20, font: 'Times New Roman' }),
                    new TextRun({ text: examDate, size: 20, font: 'Times New Roman' }),
                  ],
                })],
              }),
              new TableCell({
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                children: [new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: 'Tiempo de duración: ', bold: true, size: 20, font: 'Times New Roman' }),
                    new TextRun({ text: `${duration} min.`, size: 20, font: 'Times New Roman' }),
                  ],
                })],
              }),
            ],
          })],
        }));

        docChildren.push(new Paragraph({ spacing: { before: 60, after: 60 } }));

        // Campo nombre del alumno
        docChildren.push(new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Nombres y apellidos:', bold: true, size: 20, font: 'Times New Roman' }),
            new TextRun({ text: '_______________________________________________', size: 20, font: 'Times New Roman', color: '999999' }),
          ],
        }));

        // Línea separadora
        docChildren.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: '999999', space: 2 } },
          spacing: { after: 60 },
        }));

        // Indicaciones
        if (instructions) {
          docChildren.push(new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'INDICACIONES: ', bold: true, italics: true, size: 17, font: 'Times New Roman', underline: { type: UnderlineType.SINGLE } }),
              new TextRun({ text: instructions, bold: true, italics: true, size: 17, font: 'Times New Roman' }),
            ],
            shading: { fill: 'F0F0F0', type: ShadingType.CLEAR },
          }));
        }

        // Preguntas
        questions.forEach((q, idx) => {
          const qNum = idx + 1;
          const points = q.points || pointsPerQuestion;

          docChildren.push(new Paragraph({ spacing: { before: 120, after: 60 } }));

          // Texto de la pregunta con puntaje
          docChildren.push(new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `${qNum}    `, bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: q.question || '', bold: true, size: 20, font: 'Times New Roman' }),
              new TextRun({ text: ` (${points} PUNTOS)`, bold: true, size: 20, font: 'Times New Roman' }),
            ],
          }));

          // Opciones
          if ((q.type === 'multiple_choice' || q.type === 'multi_select') && q.options) {
            const correctAnswers = Array.isArray(q.correct) ? q.correct : [q.correct];
            q.options.forEach((opt, oi) => {
              const letter = LETTERS[oi] || String.fromCharCode(65 + oi);
              const isCorrect = correctAnswers.includes(letter);
              const optText = String(opt).replace(/^[A-Z]\)\s*/, '');

              docChildren.push(new Paragraph({
                spacing: { before: 20, after: 20 },
                indent: { left: 720 },
                children: [
                  new TextRun({
                    text: `${letter}.  ${optText}`,
                    bold: isCorrect,
                    size: 20,
                    font: 'Times New Roman',
                    color: isCorrect ? 'CC0080' : '000000',
                  }),
                ],
              }));
            });
          } else if (q.type === 'true_false') {
            const correctVal = String(q.correct || '').toLowerCase();
            ['Verdadero', 'Falso'].forEach((opt, oi) => {
              const letter = LETTERS[oi];
              const isCorrect = (oi === 0 && correctVal === 'verdadero') || (oi === 1 && correctVal === 'falso');
              docChildren.push(new Paragraph({
                spacing: { before: 20, after: 20 },
                indent: { left: 720 },
                children: [
                  new TextRun({
                    text: `${letter}.  ${opt}`,
                    bold: isCorrect,
                    size: 20,
                    font: 'Times New Roman',
                    color: isCorrect ? 'CC0080' : '000000',
                  }),
                ],
              }));
            });
          } else if (q.type === 'fill_blank') {
            docChildren.push(new Paragraph({
              spacing: { before: 40, after: 40 },
              indent: { left: 720 },
              children: [
                new TextRun({ text: '_______________________________________________', size: 20, font: 'Times New Roman', color: '999999' }),
              ],
            }));
          } else if (q.type === 'open_ended') {
            for (let li = 0; li < 3; li++) {
              docChildren.push(new Paragraph({
                spacing: { before: 40, after: 40 },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: '_________________________________________________________________', size: 20, font: 'Times New Roman', color: '999999' }),
                ],
              }));
            }
          }
        });

        // Build document
        const doc = new Document({
          numbering: { config: numberingConfig },
          sections: [{
            properties: {
              page: {
                size: { width: 11906, height: 16838 }, // A4
                margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
              },
            },
            footers: {
              default: new Footer({
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ children: [PageNumber.CURRENT], size: 20, font: 'Times New Roman' }),
                  ],
                })],
              }),
            },
            children: docChildren,
          }],
        });

        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(filePath, buffer);
        this.logger.info(`Examen DOCX generado: ${filePath}`);
        return { path: filePath, fileName };
      }
    } catch (error) {
      this.logger.error('Error al generar documento de examen', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  async listGeneratedDocuments() {
    try {
      await this.initialize();
      const files = await fs.readdir(this.outputPath);
      const documents = [];
      for (const file of files) {
        const filePath = path.join(this.outputPath, file);
        const stats = await fs.stat(filePath);
        documents.push({
          name: file, path: filePath,
          size: stats.size, created: stats.birthtime, modified: stats.mtime,
        });
      }
      return documents;
    } catch (error) {
      this.logger.error('Error al listar documentos', error);
      return [];
    }
  }
}

export default DocumentGenerator;