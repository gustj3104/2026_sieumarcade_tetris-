import { readSheet, InvalidInputError } from "read-excel-file/browser";

/** First-row cells that read as a column header rather than an actual name, so it gets skipped instead of loaded as a participant. */
const HEADER_WORDS = new Set(["이름", "성명", "name", "참가자", "참가자명", "닉네임", "선수명"]);

const ERROR_MESSAGES: Record<string, string> = {
  XLS_FILE_NOT_SUPPORTED: "예전 .xls 형식은 지원하지 않습니다. 엑셀에서 .xlsx로 다시 저장한 뒤 업로드해 주세요.",
  FILE_NOT_SUPPORTED: ".xlsx 파일만 지원합니다.",
  INVALID_ZIP: "파일을 열 수 없습니다. 손상되었거나 올바른 .xlsx 파일이 아닙니다.",
  NO_DATA: "시트에서 데이터를 찾을 수 없습니다.",
  INPUT_TYPE_NOT_SUPPORTED: "파일을 읽을 수 없습니다.",
};

/**
 * Reads the first column of an uploaded .xlsx file's first sheet into a
 * name list - one name per row, skipping a leading header cell like
 * "이름"/"성명"/"name" if present. Throws a Korean, admin-facing message
 * on anything that isn't a readable .xlsx file.
 */
export async function parseExcelNames(file: File): Promise<string[]> {
  try {
    const rows = await readSheet(file);
    const names: string[] = [];
    rows.forEach((row, index) => {
      const cell = row[0];
      if (cell === null || cell === undefined) return;
      const text = String(cell).trim();
      if (!text) return;
      if (index === 0 && HEADER_WORDS.has(text.toLowerCase())) return;
      names.push(text);
    });
    return names;
  } catch (error) {
    if (error instanceof InvalidInputError) {
      throw new Error(ERROR_MESSAGES[error.code] ?? "엑셀 파일을 읽는 중 오류가 발생했습니다.");
    }
    throw new Error("엑셀 파일을 읽는 중 오류가 발생했습니다.");
  }
}
