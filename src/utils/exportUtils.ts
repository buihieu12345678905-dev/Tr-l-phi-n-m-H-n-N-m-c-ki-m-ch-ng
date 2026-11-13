import { GroundingCheckResult, HanNomToken, TranscriptionResult } from '../types/hanNom';

export function getEffectiveReading(token: HanNomToken): string {
  return token.manualOverride?.reading ?? token.reading;
}

export function getEffectiveChar(token: HanNomToken): string {
  return token.manualOverride?.char ?? token.char;
}

export function buildMarkdownDossier(
  result: TranscriptionResult,
  grounding?: GroundingCheckResult
): string {
  const totalNonPunct = result.tokens.filter((t) => t.scriptType !== 'punctuation');
  const verifiedCount = totalNonPunct.filter(
    (t) => t.status === 'verified' || t.status === 'manual'
  ).length;

  const lines: string[] = [
    `# Biên bản Phiên âm & Kiểm chứng Hán Nôm`,
    ``,
    `- **Nhan đề**: ${result.title}`,
    `- **Loại chữ**: ${result.detectedScript}`,
    `- **Chiều đọc**: ${result.readingDirection}`,
    `- **Nhận diện nguồn**: ${result.sourceIdentification}`,
    `- **Độ tin cậy tổng thể**: ${result.overallConfidence}% (${verifiedCount}/${totalNonPunct.length} chữ đạt kiểm chứng)`,
    `- **Thời điểm xuất**: ${new Date().toLocaleString('vi-VN')}`,
    ``,
    `## 1. Nhận định văn bản học`,
    result.summaryNote,
    ``,
    `## 2. Bản đối chiếu song ngữ từng dòng`,
    ``,
  ];

  for (const line of result.lines) {
    const lineTokens = result.tokens.filter((t) => t.lineNumber === line.lineNumber);
    const updatedQuocNgu =
      lineTokens.length > 0
        ? lineTokens
            .map((t) => getEffectiveReading(t))
            .filter(Boolean)
            .join(' ')
        : line.quocNgu;

    lines.push(`### Dòng ${line.lineNumber}`);
    lines.push(`- **Nguyên văn**: ${line.hanNom}`);
    lines.push(`- **Phiên âm**: ${updatedQuocNgu}`);
    lines.push(`- **Dịch nghĩa**: ${line.translation}`);
    if (line.notes) {
      lines.push(`- **Chú giải**: ${line.notes}`);
    }
    lines.push('');
  }

  const flagged = totalNonPunct.filter((t) => t.status === 'review' || t.status === 'uncertain');
  if (flagged.length > 0 || result.verificationChecklist.length > 0) {
    lines.push(`## 3. Các điểm cần lưu ý / đối chiếu`);
    lines.push('');
    for (const item of result.verificationChecklist) {
      lines.push(`- **Dòng ${item.lineNumber} — Chữ「${item.char}」**: ${item.issue}. *Đề xuất*: ${item.suggestion}`);
    }
    for (const tok of flagged) {
      lines.push(
        `- **Dòng ${tok.lineNumber} — Chữ「${getEffectiveChar(tok)}」(${getEffectiveReading(tok)})** [${tok.confidence}%]: ${tok.etymologyNote}`
      );
    }
    lines.push('');
  }

  const manualTokens = totalNonPunct.filter((t) => t.manualOverride);
  if (manualTokens.length > 0) {
    lines.push(`## 4. Hiệu đính thủ công của người nghiên cứu`);
    lines.push('');
    for (const tok of manualTokens) {
      lines.push(
        `- **Chữ「${getEffectiveChar(tok)}」** (Dòng ${tok.lineNumber}): Đọc là **${tok.manualOverride?.reading}**${
          tok.manualOverride?.note ? ` — Ghi chú: ${tok.manualOverride.note}` : ''
        }`
      );
    }
    lines.push('');
  }

  if (grounding) {
    lines.push(`## 5. Kết quả đối chiếu nguồn trực tuyến`);
    lines.push('');
    lines.push(grounding.summaryMarkdown);
    if (grounding.citations.length > 0) {
      lines.push('');
      lines.push('**Nguồn tham khảo:**');
      for (const cite of grounding.citations) {
        lines.push(`- [${cite.title}](${cite.uri})`);
      }
    }
  }

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
