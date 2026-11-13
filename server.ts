import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Thiếu cấu hình GEMINI_API_KEY trên máy chủ.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getGeminiErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Khóa API Gemini chưa hợp lệ hoặc chưa được cấp quyền. Vui lòng kiểm tra trong mục Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Hệ thống đang chạm giới hạn lưu lượng truy cập (429). Vui lòng thử lại sau ít phút.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: 'Không tìm thấy mô hình AI được cấu hình.',
    };
  }
  return {
    status: 500,
    message: raw || 'Đã xảy ra lỗi khi xử lý yêu cầu phiên âm Hán Nôm.',
  };
}

const DOC_TYPE_LABELS: Record<string, string> = {
  auto: 'Tự động nhận diện thể loại',
  'tho-duong': 'Thơ Đường luật / Hán thi (vần, đối ngẫu, niêm luật)',
  'luc-bat': 'Truyện Nôm / Thơ Lục bát (6-8, hiệp vần chữ Nôm)',
  'sac-phong': 'Sắc phong / Chiếu chỉ / Văn bản hành chính triều đình',
  'van-bia': 'Văn bia / Minh văn khắc đá (cấu trúc bi ký, niên hiệu)',
  'gia-pha': 'Gia phả / Thế thứ / Tộc ước',
  'khe-uoc': 'Khế ước điền thổ / Văn tự dân gian',
};

const DIRECTION_LABELS: Record<string, string> = {
  auto: 'Tự động xác định chiều đọc (ưu tiên kiểm tra cột dọc phải sang trái đối với mộc bản/văn bia cổ)',
  'vertical-rtl': 'Đọc theo cột dọc từ phải sang trái',
  'horizontal-ltr': 'Đọc theo hàng ngang từ trái sang phải',
};

const transcriptionSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Nhan đề ngắn gọn của đoạn tư liệu bằng tiếng Việt.',
    },
    detectedScript: {
      type: Type.STRING,
      description: 'Loại chữ phát hiện (ví dụ: Chữ Hán cổ điển, Chữ Nôm lục bát, Hán Nôm hỗn hợp).',
    },
    readingDirection: {
      type: Type.STRING,
      description: 'Chiều đọc thực tế đã sử dụng (ví dụ: Dọc từ phải sang trái, Ngang từ trái sang phải).',
    },
    sourceIdentification: {
      type: Type.STRING,
      description: 'Nhận diện tác phẩm/niên đại/điển tích nếu có thể xác định, hoặc ghi "Chưa xác định nguồn kinh điển (văn bản riêng)".',
    },
    overallConfidence: {
      type: Type.NUMBER,
      description: 'Điểm tin cậy tổng thể từ 0 đến 100 dựa trên độ rõ nét và mức độ đơn nghĩa.',
    },
    summaryNote: {
      type: Type.STRING,
      description: 'Nhận định văn bản học tổng quan (phong cách chữ, đặc điểm âm đọc Hán-Việt/Nôm, điểm cần lưu ý).',
    },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          lineNumber: { type: Type.INTEGER },
          hanNom: { type: Type.STRING, description: 'Nguyên văn Hán Nôm của dòng/câu.' },
          quocNgu: { type: Type.STRING, description: 'Phiên âm Quốc ngữ chuẩn xác (tuyệt đối không dùng bính âm tiếng Trung).' },
          translation: { type: Type.STRING, description: 'Dịch nghĩa tiếng Việt mượt mà, sát nghĩa gốc.' },
          notes: { type: Type.STRING, description: 'Chú giải từ cổ, điển cố hoặc lý do chọn âm đọc.' },
        },
        required: ['lineNumber', 'hanNom', 'quocNgu', 'translation', 'notes'],
      },
    },
    tokens: {
      type: Type.ARRAY,
      description: 'Danh sách từng chữ Hán/Nôm theo đúng thứ tự đọc để kiểm chứng từng chữ.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          lineNumber: { type: Type.INTEGER },
          char: { type: Type.STRING, description: 'Một ký tự Hán hoặc Nôm.' },
          scriptType: {
            type: Type.STRING,
            description: 'Một trong các giá trị: han, nom, variant, punctuation',
          },
          reading: { type: Type.STRING, description: 'Âm đọc Quốc ngữ được chọn trong ngữ cảnh.' },
          alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Các âm đọc khác có thể có (đa âm, giả tá, hoặc đọc khác theo vùng/niên đại).',
          },
          similarForms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Các chữ có tự dạng gần giống dễ nhận diện nhầm (ví dụ 己/已/巳, 戊/戌).',
          },
          confidence: { type: Type.NUMBER, description: 'Độ tin cậy từ 0 đến 100.' },
          status: {
            type: Type.STRING,
            description: 'verified (>=88, rõ nét và chắc chắn), review (70-87, có đa âm hoặc cần đối chiếu), uncertain (<70, mờ nét hoặc nghi ngờ)',
          },
          etymologyNote: {
            type: Type.STRING,
            description: 'Phân tích bộ thủ / cấu tạo chữ Nôm (hình thanh, hội ý, giả tá) và nghĩa gốc.',
          },
          verificationBasis: {
            type: Type.STRING,
            description: 'Căn cứ kiểm chứng (ngữ cảnh câu, vần luật, từ ghép Hán-Việt, nét chữ trên ảnh).',
          },
        },
        required: [
          'id',
          'lineNumber',
          'char',
          'scriptType',
          'reading',
          'alternatives',
          'similarForms',
          'confidence',
          'status',
          'etymologyNote',
          'verificationBasis',
        ],
      },
    },
    verificationChecklist: {
      type: Type.ARRAY,
      description: 'Danh sách các chữ/cụm từ trọng tâm cần người nghiên cứu đối chiếu lại.',
      items: {
        type: Type.OBJECT,
        properties: {
          char: { type: Type.STRING },
          lineNumber: { type: Type.INTEGER },
          issue: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ['char', 'lineNumber', 'issue', 'suggestion'],
      },
    },
  },
  required: [
    'title',
    'detectedScript',
    'readingDirection',
    'sourceIdentification',
    'overallConfidence',
    'summaryNote',
    'lines',
    'tokens',
    'verificationChecklist',
  ],
};

const deepCheckSchema = {
  type: Type.OBJECT,
  properties: {
    char: { type: Type.STRING },
    recommendedReading: { type: Type.STRING },
    scriptType: { type: Type.STRING },
    radicalAnalysis: { type: Type.STRING },
    alternativeCandidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          reading: { type: Type.STRING },
          meaning: { type: Type.STRING },
          likelihood: { type: Type.STRING },
        },
        required: ['reading', 'meaning', 'likelihood'],
      },
    },
    similarConfusableChars: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          char: { type: Type.STRING },
          reading: { type: Type.STRING },
          difference: { type: Type.STRING },
        },
        required: ['char', 'reading', 'difference'],
      },
    },
    contextualReasoning: { type: Type.STRING },
    updatedConfidence: { type: Type.NUMBER },
    updatedStatus: { type: Type.STRING },
  },
  required: [
    'char',
    'recommendedReading',
    'scriptType',
    'radicalAnalysis',
    'alternativeCandidates',
    'similarConfusableChars',
    'contextualReasoning',
    'updatedConfidence',
    'updatedStatus',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '18mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/transcribe', async (req, res) => {
    try {
      const {
        mode,
        text,
        imageBase64,
        imageMimeType,
        docType = 'auto',
        readingDirection = 'auto',
        extraContext = '',
      } = req.body ?? {};

      if (mode === 'text' && (!text || typeof text !== 'string' || !text.trim())) {
        return res.status(400).json({ error: 'Vui lòng nhập văn bản Hán Nôm cần phiên âm.' });
      }
      if (mode === 'image' && (!imageBase64 || typeof imageBase64 !== 'string')) {
        return res.status(400).json({ error: 'Vui lòng tải lên hình ảnh tư liệu Hán Nôm.' });
      }

      const ai = getAiClient();
      const docLabel = DOC_TYPE_LABELS[docType] || DOC_TYPE_LABELS.auto;
      const dirLabel = DIRECTION_LABELS[readingDirection] || DIRECTION_LABELS.auto;

      const systemInstruction = [
        'Bạn là chuyên gia văn bản học Hán Nôm cao cấp (chuẩn Viện Nghiên cứu Hán Nôm Việt Nam).',
        'Nhiệm vụ: Nhận diện chính xác ký tự Hán và Chữ Nôm, phiên âm sang chữ Quốc ngữ Việt Nam (tuyệt đối KHÔNG dùng Pinyin tiếng Trung), dịch nghĩa tiếng Việt, và thực hiện kiểm chứng văn bản học từng chữ một.',
        'Nguyên tắc kiểm chứng nghiêm ngặt:',
        '1. Không suy đoán bừa bãi: nếu chữ bị mờ, sứt nét, hoặc chữ Nôm có nhiều cách đọc (giả tá / hình thanh), phải đánh dấu status là "review" hoặc "uncertain", hạ điểm confidence và liệt kê các âm đọc/tự dạng thay thế.',
        '2. Với từng ký tự trong mảng tokens: tách từng chữ Hán/Nôm riêng lẻ (không gộp cả câu vào một token; dấu câu nếu có để scriptType là "punctuation"). Đảm bảo mỗi ký tự trong các dòng lines đều có mặt đầy đủ trong tokens theo đúng thứ tự.',
        '3. Với văn bản ảnh mộc bản, văn bia, sắc phong: chú ý phân biệt chiều đọc dọc phải-sang-trái với ngang trái-sang-phải, và lưu ý các chữ húy, chữ dị thể, chữ giản lược nét trong khắc bản.',
        '4. Ngôn ngữ giải thích hoàn toàn bằng tiếng Việt chuẩn mực học thuật.',
      ].join('\n');

      const userPrompt = [
        `Thể loại văn bản: ${docLabel}.`,
        `Quy tắc chiều đọc: ${dirLabel}.`,
        extraContext ? `Ghi chú bổ sung từ người nghiên cứu: ${extraContext}` : '',
        mode === 'text'
          ? `Văn bản Hán Nôm đầu vào:\n${text.trim()}`
          : 'Hãy đọc kỹ hình ảnh tư liệu Hán Nôm đính kèm, trích xuất nguyên văn từng dòng và kiểm chứng từng chữ.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (mode === 'image') {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({
          inlineData: {
            mimeType: imageMimeType || 'image/png',
            data: cleanBase64,
          },
        });
      }
      parts.push({ text: userPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: transcriptionSchema,
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      // Normalize status & tokens defensively
      if (Array.isArray(parsed.tokens)) {
        parsed.tokens = parsed.tokens.map((t: Record<string, unknown>, idx: number) => {
          const conf = typeof t.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(t.confidence))) : 80;
          const validStatus =
            t.status === 'verified' || t.status === 'review' || t.status === 'uncertain'
              ? t.status
              : conf >= 88
                ? 'verified'
                : conf >= 70
                  ? 'review'
                  : 'uncertain';
          const validScript =
            t.scriptType === 'han' ||
            t.scriptType === 'nom' ||
            t.scriptType === 'variant' ||
            t.scriptType === 'punctuation'
              ? t.scriptType
              : 'han';
          return {
            id: typeof t.id === 'string' && t.id ? t.id : `tok-${idx + 1}`,
            lineNumber: typeof t.lineNumber === 'number' ? t.lineNumber : 1,
            char: String(t.char ?? ''),
            scriptType: validScript,
            reading: String(t.reading ?? ''),
            alternatives: Array.isArray(t.alternatives) ? t.alternatives.map(String) : [],
            similarForms: Array.isArray(t.similarForms) ? t.similarForms.map(String) : [],
            confidence: conf,
            status: validStatus,
            etymologyNote: String(t.etymologyNote ?? ''),
            verificationBasis: String(t.verificationBasis ?? ''),
          };
        });
      }

      return res.json(parsed);
    } catch (err) {
      console.error('Error in /api/transcribe:', err);
      const { status, message } = getGeminiErrorMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/grounding-check', async (req, res) => {
    try {
      const { hanNomText, quocNguText, sourceGuess } = req.body ?? {};
      if (!hanNomText || typeof hanNomText !== 'string') {
        return res.status(400).json({ error: 'Thiếu văn bản Hán Nôm để đối chiếu nguồn.' });
      }

      const ai = getAiClient();
      const prompt = [
        'Hãy thực hiện kiểm chứng đối chiếu văn bản Hán Nôm sau đây với các nguồn học thuật, điển tịch, từ điển Hán Nôm (như Thi Viện, Nom Foundation, Viện Nghiên cứu Hán Nôm, bản khắc cổ):',
        `Nguyên văn Hán Nôm:\n${hanNomText}`,
        quocNguText ? `Bản phiên âm dự kiến:\n${quocNguText}` : '',
        sourceGuess ? `Giả thuyết xuất xứ/tác phẩm:\n${sourceGuess}` : '',
        'Yêu cầu trả lời ngắn gọn, súc tích bằng tiếng Việt (dạng Markdown rõ ràng):',
        '- Xác nhận văn bản có khớp với dị bản/ấn bản công bố nào không.',
        '- Nêu rõ các điểm dị biệt (nếu có chữ khác nhau giữa các bản khắc/bản chép tay).',
        '- Kết luận độ xác thực của bản phiên âm.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const seen = new Set<string>();
      const citations: Array<{ title: string; uri: string }> = [];

      for (const chunk of chunks) {
        const web = (chunk as { web?: { uri?: string; title?: string } }).web;
        if (web?.uri && !seen.has(web.uri)) {
          seen.add(web.uri);
          citations.push({
            title: web.title || web.uri,
            uri: web.uri,
          });
        }
      }

      return res.json({
        summaryMarkdown: response.text ?? 'Không có kết quả đối chiếu từ nguồn trực tuyến.',
        citations,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error in /api/grounding-check:', err);
      const { status, message } = getGeminiErrorMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  app.post('/api/reverify-token', async (req, res) => {
    try {
      const { fullText, targetChar, currentReading, lineContext, userQuestion } = req.body ?? {};
      if (!targetChar || typeof targetChar !== 'string') {
        return res.status(400).json({ error: 'Thiếu ký tự cần kiểm chứng lại.' });
      }

      const ai = getAiClient();
      const prompt = [
        'Thực hiện khảo chứng chuyên sâu cho MỘT ký tự Hán/Nôm cụ thể trong ngữ cảnh câu.',
        `Ký tự cần kiểm chứng: ${targetChar}`,
        currentReading ? `Âm đọc hiện tại: ${currentReading}` : '',
        lineContext ? `Câu chứa chữ này: ${lineContext}` : '',
        fullText ? `Toàn văn ngữ cảnh:\n${fullText}` : '',
        userQuestion ? `Câu hỏi/nghi vấn của người nghiên cứu: ${userQuestion}` : '',
        'Hãy phân tích bộ thủ, quy tắc cấu tạo chữ Nôm/Hán, các chữ có mặt chữ gần giống dễ nhầm lẫn khi OCR/đọc bản khắc, và đề xuất âm đọc chuẩn xác nhất bằng tiếng Việt.',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: 'application/json',
          responseSchema: deepCheckSchema,
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (err) {
      console.error('Error in /api/reverify-token:', err);
      const { status, message } = getGeminiErrorMessage(err);
      return res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
