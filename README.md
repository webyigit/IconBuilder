# 아이콘 빌더

샘플 아이콘(파일·URL) + 키워드·설명 → 비슷한 스타일의 아이콘 생성 → PNG·JPG·GIF·SVG 내보내기·보관.

## 폴더
| 경로 | 내용 |
|---|---|
| `index.html`, `css/`, `js/`, `vendor/` | 정적 웹앱(GitHub Pages 루트). 빌드 불필요 |
| `js/config.js` | 배포 기본값(Supabase 주소·공개 키, 엔진) |
| `supabase/schema.sql` | 테이블·RLS·스토리지 버킷 |
| `supabase/functions/generate-icon/` | Claude API로 SVG 생성하는 Edge Function |
| `docs/` | 요구사항·화면설계·테스트 결함 리포트 |
| `gallery/` | 오픈소스 아이콘 갤러리(아이콘·이모지 107개 스타일 + 브랜드 53곳 로고 모음). 출처·라이선스·선정 지표는 `gallery/LICENSES.md`, 데이터 재생성은 `gallery/tools/build.py` |

## 로컬 실행
```bash
python3 -m http.server 8080   # http://localhost:8080
```
키 없이 '브라우저 저장 + 내장 생성기'로 바로 동작합니다.

## 배포 순서 (승인 후 진행)
1. Supabase 프로젝트 생성 → Authentication에서 **Anonymous sign-ins 켜기**
2. SQL Editor에서 `supabase/schema.sql` 실행
3. 함수 배포: `supabase functions deploy generate-icon`
4. 비밀값: `supabase secrets set ANTHROPIC_API_KEY=... ALLOWED_ORIGIN=https://<계정>.github.io`
5. `js/config.js`에 프로젝트 주소·**공개(publishable/anon) 키**만 입력 (service_role 금지)
6. GitHub 저장소 루트에 올리고 Settings → Pages 활성화

## 보안 원칙
- AI 키는 Edge Function 비밀값으로만. 저장소·브라우저에 두지 않음.
- 화면에 SVG는 `<img src="data:">`로만 렌더링(스크립트 실행 차단) + 정리(sanitize).
