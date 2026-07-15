# Travel Wallet Demo

모바일에서 사용하는 베트남 동 지갑 + 여행 지출 계산 데모입니다.

## 포함된 화면

- `지갑 페이지`: 지폐 수량을 조절하면 총액이 자동 계산됩니다.
- `지출 페이지`: 제목, 동 금액, 날짜를 입력하면 일별 합계와 전체 지출이 자동으로 갱신됩니다.

## 로컬 실행

Vercel 배포용으로 `api/`와 함께 동작하도록 구성했습니다.

- `index.html`
- `styles.css`
- `app.js`
- `api/state.js`
- `api/_supabase.js`
- `package.json`

브라우저에서 `index.html`을 바로 열어도 되고, Vercel에 정적 사이트로 올려도 됩니다.
브라우저에서 직접 열면 `api/` 호출이 안 되기 때문에 자동으로 로컬 저장소 폴백으로 동작합니다.

## Supabase 연결 메모

이 데모는 Vercel 서버리스 API를 통해 Supabase에 연결합니다.
브라우저에 secret key를 넣지 않습니다.

Vercel 환경 변수:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

예시 파일:

- [.env.example](./.env.example)

실서비스로 바꿀 때는 아래 파일을 참고하세요.

- [supabase-schema.sql](./supabase-schema.sql)

권장 테이블:

- `wallet_denominations`
- `expenses`

## 배포 메모

### 1. Supabase 준비

Supabase 프로젝트의 SQL Editor에서 [supabase-schema.sql](./supabase-schema.sql)의 전체 내용을 실행합니다.

### 2. Vercel 환경 변수 등록

Vercel Project Settings > Environment Variables에 아래 두 값을 등록합니다.

- `SUPABASE_URL`: Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase API Settings의 `service_role` secret key

`SUPABASE_SERVICE_ROLE_KEY`는 절대 `app.js`, `.env.example`, Git 저장소 또는 `NEXT_PUBLIC_*` 같은 브라우저 공개 변수에 넣지 않습니다. 이 레포에서는 `api/state.js`가 서버에서만 해당 키를 사용합니다.

### 3. Vercel 배포

Vercel에서 이 레포를 Import하고 Root Directory는 현재 루트로 둡니다. 별도 Build Command나 Output Directory는 필요하지 않습니다. `package.json`의 `@supabase/supabase-js`를 Vercel이 설치하고, `api/state.js`를 서버리스 함수로 배포합니다.

SPA 해시 라우팅(`#wallet`, `#expense`)을 사용하므로 추가 rewrites 없이도 동작합니다.

### 운영 범위

현재 API에는 로그인 인증이 없습니다. 혼자 사용하는 여행용 앱이나 데모에는 적합하지만, URL을 여러 사용자에게 공개할 서비스라면 Supabase Auth와 사용자별 데이터 구분을 추가해야 합니다. 서버리스 API가 `service_role` 키로 DB에 접근하므로 브라우저에 secret key가 노출되지는 않습니다.
