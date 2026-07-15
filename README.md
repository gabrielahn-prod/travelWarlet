# Travel Wallet Demo

모바일에서 사용하는 베트남 동 지갑 + 여행 지출 계산 데모입니다.

## 포함된 화면

- `지갑 페이지`: 지폐 수량을 조절하면 총액이 자동 계산됩니다.
- `지출 페이지`: 제목, 동 금액, 날짜를 입력하면 일별 합계와 전체 지출이 자동으로 갱신됩니다.

## 로컬 실행

정적 파일이라 별도 빌드가 필요 없습니다.

- `index.html`
- `styles.css`
- `app.js`

브라우저에서 `index.html`을 바로 열어도 되고, Vercel에 정적 사이트로 올려도 됩니다.

## Supabase 연결 메모

이 데모는 현재 `localStorage`로 동작합니다.
실서비스로 바꿀 때는 아래 파일을 참고하세요.

- [supabase-schema.sql](./supabase-schema.sql)

권장 테이블:

- `wallet_denominations`
- `expenses`

## 배포 메모

Vercel에서는 루트 디렉터리를 그대로 배포하면 됩니다.
SPA 해시 라우팅(`#wallet`, `#expense`)을 사용하므로 추가 rewrites 없이도 동작합니다.
