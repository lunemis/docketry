# docketry

**AI 산출물을 위한 셀프호스팅 리뷰 보드.**

에이전트가 만든 설계서·비교분석·리서치 리포트가 채팅에 파묻히지 않게 — 한 명령으로 웹페이지로 게시하고, 모바일 친화적인 받은함에서 읽고·보관하고·버린다.

```
나:      "board에 올려줘"
에이전트: docket publish design-review.html --type review --summary "3안 비교, 2안 권장"
나:      폰에서 보드 열기 → 리뷰 → 보관. 끝.
```

## 차별점

- **에이전트 불문** — CLI/REST만 있으면 게시 가능 (Claude Code, Codex, Cursor, aider, 자작 스크립트). [`integrations/`](integrations/)에 스킬·프롬프트 동봉.
- **리뷰를 위한 설계** — 미읽음, 유형 뱃지(검토/결정/리포트/정보/재미), 핀, 보관함/휴지통+실행취소. 채팅 스크롤백엔 없는 산출물 수명주기.
- **프라이빗** — 데이터가 내 머신 밖으로 안 나감. UI는 PIN, API는 토큰, 산출물은 sandbox iframe+CSP 격리.
- **무(無)인프라** — DB 없음. 항목 = 폴더(meta.json + HTML/MD 파일 하나). 백업은 `cp -r`.
- **완전한 산출물** — Markdown은 문서 템플릿으로, HTML은 인라인 JS 포함 인터랙티브 페이지 그대로.

## 빠른 시작 · 게시 · 설정

영문 [README](README.md) 참고 (명령·환경변수 동일).
UI를 한국어로 쓰려면 `.env.local`에 `NEXT_PUBLIC_DOCKET_LOCALE=ko`.

## 라이선스

[MIT](LICENSE)
