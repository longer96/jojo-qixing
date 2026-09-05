import JSZip from "jszip";
import mammoth from "mammoth";
import { createRequire } from "module";
import path from "path";
import * as XLSX from "xlsx";

/**
 * pdf-parse 通过 createRequire 在运行时从 node_modules 原样加载：
 * 其内部 worker 文件按相对路径解析，不能经打包器处理。
 */
let pdfParseModule: typeof import("pdf-parse") | null = null;

function loadPdfParse(): typeof import("pdf-parse") {
  if (!pdfParseModule) {
    const req = createRequire(path.join(process.cwd(), "package.json"));
    pdfParseModule = req("pdf-parse") as typeof import("pdf-parse");
  }
  return pdfParseModule;
}

/** 支持的批量导入文件类型 */
export const SUPPORTED_EXTENSIONS = [
  ".docx",
  ".pptx",
  ".xlsx",
  ".xls",
  ".pdf",
  ".md",
  ".txt",
] as const;

export function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

export function isSupportedFile(name: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(
    getExtension(name),
  );
}

/** 统一入口：按扩展名解析各类文档为纯文本 */
export async function extractTextFromFile(
  name: string,
  buffer: Buffer,
): Promise<string> {
  const ext = getExtension(name);
  switch (ext) {
    case ".docx":
      return docxToText(buffer);
    case ".md":
    case ".txt":
      return buffer.toString("utf8").trim();
    case ".pdf":
      return pdfToText(buffer);
    case ".xlsx":
    case ".xls":
      return excelToText(buffer);
    case ".pptx":
      return pptxToText(buffer);
    default:
      throw new Error(`不支持的文件类型：${ext || name}`);
  }
}

async function docxToText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfToText(buffer: Buffer): Promise<string> {
  const { PDFParse } = loadPdfParse();
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    await parser.destroy();
  }
}

function excelToText(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
      wb.Sheets[sheetName],
      { header: 1, defval: "" },
    );
    const lines = rows
      .map((row) =>
        row
          .map((cell) => String(cell ?? "").trim())
          .filter(Boolean)
          .join(" | "),
      )
      .filter(Boolean);
    if (lines.length > 0) {
      parts.push(`【工作表：${sheetName}】\n${lines.join("\n")}`);
    }
  }
  return parts.join("\n\n").trim();
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function pptxToText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });
  const parts: string[] = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.file(slideNames[i])!.async("string");
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => unescapeXml(m[1]).trim())
      .filter(Boolean);
    if (texts.length > 0) {
      parts.push(`【第 ${i + 1} 页】\n${texts.join("\n")}`);
    }
  }
  return parts.join("\n\n").trim();
}
