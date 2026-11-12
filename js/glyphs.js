// 24x24 격자 기준 선(stroke) 글리프. 가상 생성기에서 사용.
// d: path 데이터, k: 매칭 키워드(한/영)
export const GLYPHS = [
  { id: 'home', k: ['home', 'house', '집', '홈', '메인'], d: 'M3 11l9-7 9 7 M5 10v10h5v-6h4v6h5V10' },
  { id: 'user', k: ['user', 'person', 'profile', 'account', '사용자', '사람', '프로필', '회원', '계정'], d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6' },
  { id: 'users', k: ['users', 'team', 'group', 'people', '팀', '그룹', '사람들', '커뮤니티'], d: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.8c2.4.6 4 2.4 4 5.2' },
  { id: 'search', k: ['search', 'find', 'magnifier', '검색', '찾기', '돋보기'], d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M16 16l5 5' },
  { id: 'heart', k: ['heart', 'like', 'love', 'favorite', '하트', '좋아요', '사랑', '찜', '관심'], d: 'M12 20s-7-4.5-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.5-9 9-9 9z' },
  { id: 'star', k: ['star', 'rating', 'favorite', 'bookmark', '별', '평점', '즐겨찾기', '추천'], d: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z' },
  { id: 'mail', k: ['mail', 'email', 'message', 'letter', '메일', '이메일', '편지', '우편'], d: 'M3 6h18v12H3z M3 7l9 6 9-6' },
  { id: 'settings', k: ['settings', 'gear', 'config', 'setup', '설정', '톱니', '환경설정', '관리'], d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1' },
  { id: 'bell', k: ['bell', 'notification', 'alert', 'alarm', '알림', '종', '벨', '알람'], d: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0' },
  { id: 'camera', k: ['camera', 'photo', 'picture', '카메라', '사진', '촬영'], d: 'M3 8h4l2-3h6l2 3h4v11H3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'cart', k: ['cart', 'shop', 'shopping', 'buy', 'store', '장바구니', '쇼핑', '구매', '카트', '상점'], d: 'M3 4h2l2.5 11h11L21 7H6.5 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  { id: 'calendar', k: ['calendar', 'date', 'schedule', 'event', '달력', '캘린더', '일정', '날짜', '예약'], d: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5' },
  { id: 'chat', k: ['chat', 'comment', 'talk', 'bubble', 'message', '채팅', '대화', '댓글', '말풍선', '상담'], d: 'M4 5h16v11H9l-5 4z' },
  { id: 'lock', k: ['lock', 'security', 'password', 'secure', 'private', '잠금', '보안', '비밀번호', '자물쇠'], d: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2' },
  { id: 'cloud', k: ['cloud', 'weather', 'storage', '클라우드', '구름', '날씨', '저장소'], d: 'M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5a4.8 4.8 0 0 1-.5 9.5z' },
  { id: 'file', k: ['file', 'document', 'doc', 'paper', 'report', '파일', '문서', '보고서', '서류'], d: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6' },
  { id: 'phone', k: ['phone', 'call', 'contact', 'tel', '전화', '연락', '통화', '고객센터'], d: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z' },
  { id: 'pin', k: ['map', 'pin', 'location', 'place', 'gps', '지도', '위치', '장소', '핀', '주소'], d: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  { id: 'music', k: ['music', 'audio', 'song', 'sound', '음악', '노래', '오디오', '사운드'], d: 'M9 18V5l11-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { id: 'check', k: ['check', 'done', 'ok', 'complete', 'success', '체크', '완료', '확인', '성공'], d: 'M4 12l5 5L20 6' },
  { id: 'plus', k: ['plus', 'add', 'new', 'create', '추가', '더하기', '플러스', '신규'], d: 'M12 4v16 M4 12h16' },
  { id: 'download', k: ['download', 'save', 'export', '다운로드', '내려받기', '저장', '내보내기'], d: 'M12 3v12 M7 10l5 5 5-5 M4 20h16' },
  { id: 'upload', k: ['upload', 'import', 'share', '업로드', '올리기', '가져오기'], d: 'M12 15V3 M7 8l5-5 5 5 M4 20h16' },
  { id: 'trash', k: ['trash', 'delete', 'remove', 'bin', '삭제', '휴지통', '쓰레기', '제거'], d: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6' },
  { id: 'edit', k: ['edit', 'pen', 'pencil', 'write', 'modify', '편집', '수정', '연필', '쓰기', '작성'], d: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4' },
  { id: 'image', k: ['image', 'gallery', 'picture', 'photo', '이미지', '갤러리', '그림', '앨범'], d: 'M3 5h18v14H3z M8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5-11 9' },
  { id: 'play', k: ['play', 'video', 'movie', 'media', 'start', '재생', '영상', '비디오', '동영상', '시작'], d: 'M7 4l13 8-13 8z' },
  { id: 'wifi', k: ['wifi', 'network', 'internet', 'signal', '와이파이', '네트워크', '인터넷', '신호'], d: 'M2 9a15 15 0 0 1 20 0 M5 12.5a10 10 0 0 1 14 0 M8.5 16a5 5 0 0 1 7 0 M12 19.5h.01' },
  { id: 'sun', k: ['sun', 'light', 'day', 'bright', '해', '태양', '낮', '밝기', '라이트'], d: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5' },
  { id: 'moon', k: ['moon', 'night', 'dark', 'sleep', '달', '밤', '다크', '수면'], d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z' },
  { id: 'gift', k: ['gift', 'present', 'reward', 'event', 'coupon', '선물', '이벤트', '혜택', '쿠폰', '보상'], d: 'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8C10 4 7 4 7 6s3 2 5 2 M12 8c2-4 5-4 5-2s-3 2-5 2' },
  { id: 'chart', k: ['chart', 'graph', 'stats', 'analytics', 'data', 'report', '차트', '그래프', '통계', '분석', '데이터'], d: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-8' },
  { id: 'card', k: ['card', 'payment', 'credit', 'pay', 'money', 'wallet', '카드', '결제', '지불', '돈', '지갑'], d: 'M3 6h18v12H3z M3 10h18 M7 15h4' },
  { id: 'globe', k: ['globe', 'world', 'web', 'language', 'global', '지구', '세계', '웹', '언어', '글로벌'], d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18' },
  { id: 'bolt', k: ['bolt', 'flash', 'energy', 'power', 'fast', '번개', '에너지', '전기', '빠른', '파워'], d: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  { id: 'book', k: ['book', 'read', 'library', 'study', 'guide', '책', '독서', '도서', '공부', '가이드', '교육'], d: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 21a2 2 0 0 1 2-2h13' },
  { id: 'car', k: ['car', 'vehicle', 'drive', 'transport', '자동차', '차', '운전', '교통'], d: 'M3 16v-4l2-5h14l2 5v4z M3 16v2h3v-2 M18 16v2h3v-2 M7 13h.01 M17 13h.01' },
  { id: 'coffee', k: ['coffee', 'cafe', 'cup', 'drink', 'tea', '커피', '카페', '컵', '음료', '차'], d: 'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 9h1.5a2.5 2.5 0 0 1 0 5H17 M8 3v2 M12 3v2' },
];

export const glyphLabel = g => g.k.find(x => /[가-힣]/.test(x)) || g.id;

// 키워드 → 글리프 매칭. 점수 높은 순으로 count개, 부족하면 해시 기반 보충.
export function matchGlyphs(keywords, count = 4) {
  const words = keywords.map(w => w.trim().toLowerCase()).filter(Boolean);
  const scored = GLYPHS.map(g => {
    let s = 0;
    for (const w of words) {
      for (const k of g.k) {
        if (k === w) s += 3;
        else if (w.length >= 2 && k.length >= 2 && (k.startsWith(w) || w.startsWith(k))) s += 1;
      }
    }
    return { g, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.g);
  const out = [...new Set(scored)];
  let h = hash(words.join(',') || 'icon');
  while (out.length < count) {
    const g = GLYPHS[h % GLYPHS.length];
    if (!out.includes(g)) out.push(g);
    h = (h * 31 + 7) >>> 0;
  }
  return { glyphs: out.slice(0, count), matched: scored.length > 0 };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
