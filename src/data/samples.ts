import { ArchivalSample } from '../types/hanNom';

export const ARCHIVAL_SAMPLES: ArchivalSample[] = [
  {
    id: 'nam-quoc-son-ha',
    title: 'Nam Quốc Sơn Hà (Thần thi)',
    era: 'Thời Lý (thế kỷ XI)',
    docType: 'tho-duong',
    readingDirection: 'vertical-rtl',
    scriptLabel: 'Chữ Hán · Thất ngôn tứ tuyệt',
    description: 'Bản khắc mộc bản dọc từ phải sang trái, bốn câu thất ngôn kinh điển.',
    hanNomText: '南國山河南帝居\n截然分定在天書\n如何逆虜來侵犯\n汝等行看取敗虛',
    sealText: '國史館印',
    plateStyle: 'woodblock',
  },
  {
    id: 'truyen-kieu-mo-dau',
    title: 'Đoạn Trường Tân Thanh (Khai từ)',
    era: 'Nguyễn Du · Bản khắc 1866',
    docType: 'luc-bat',
    readingDirection: 'vertical-rtl',
    scriptLabel: 'Chữ Nôm · Thể Lục bát',
    description: 'Chữ Nôm cổ điển kết hợp chữ Hán, hiệp vần lục bát 6–8.',
    hanNomText: '百𢆥𥪞𡎝𠊛𢠩\n𡦂才𡦂命窖𦓡恄𠑬\n trải過𠬠局𣷮𣷭\n仍調𥉩𧡊㐌 đau 𢚸',
    sealText: '喃字珍藏',
    plateStyle: 'woodblock',
  },
  {
    id: 'binh-ngo-dai-cao',
    title: 'Bình Ngô Đại Cáo (Khởi đầu)',
    era: 'Nguyễn Trãi · 1428',
    docType: 'sac-phong',
    readingDirection: 'vertical-rtl',
    scriptLabel: 'Chữ Hán · Văn biền ngẫu',
    description: 'Thể cáo triều Lê sơ, đối ngẫu chặt chẽ và nhiều điển cố.',
    hanNomText: '代天行化皇上若曰\n蓋聞仁義之舉要在安民\n弔伐之師莫先去暴\n惟我大越之國實為文獻之邦',
    sealText: '翰林院印',
    plateStyle: 'edict',
  },
  {
    id: 'van-bia-khoa-cu',
    title: 'Văn bia Đề danh Tiến sĩ (Trích)',
    era: 'Bia đá Văn Miếu',
    docType: 'van-bia',
    readingDirection: 'vertical-rtl',
    scriptLabel: 'Chữ Hán · Minh văn khắc đá',
    description: 'Mẫu bia ký chữ trắng trên nền đá mực in dập (thác bản).',
    hanNomText: '賢才國家之元氣\n元氣盛則國勢強而隆\n元氣衰則國勢弱而污',
    sealText: '文廟石碑',
    plateStyle: 'stele',
  },
];

// Clean standard Truyện Kiều lines without accidental Latin mixing
ARCHIVAL_SAMPLES[1].hanNomText =
  '百𢆥𥪞𡎝𠊛𢠩\n𡦂才𡦂命窖𦓡恄𠑬\n𣇜過𠬠局𣷮𣷭\n仍調𥉩𧡊𢚸𢧚𣣔𤴬';
