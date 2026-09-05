import mammoth from "mammoth";

/** 解析 docx 为纯文本（管理后台上传知识库文档用） */
export async function docxToText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
