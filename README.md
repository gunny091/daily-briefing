# Daily Briefing

매일 아침 브리핑을 한 번 생성해서 Discord webhook으로 전송하는 TypeScript 기반 one-shot 서비스입니다.

## Requirements

- Node.js 20+
- npm
- Docker / Docker Compose

## Config

실행 전 `config.yml.example`을 참고해 루트에 `config.yml`을 생성하세요.

```yml
discord:
  webhookUrl: "https://discord.com/api/webhooks/your/webhook"

weather:
  latitude: 37.5665
  longitude: 126.9780

notion:
  token: "secret_xxx"
  schedule:
    databaseId: "your_schedule_database_id"
    dateProperty: "Date"
  daily:
    databaseId: "your_daily_page_database_id"
    dateProperty: "Date"

ddays:
  - name: "Name"
    date: "2027-01-01"
```

필수 필드:

- `discord.webhookUrl`
- `weather.latitude`
- `weather.longitude`
- `notion.token`
- `notion.schedule.databaseId`
- `notion.schedule.dateProperty`
- `notion.daily.databaseId`
- `notion.daily.dateProperty`
- `ddays[].name`
- `ddays[].date`

## Run

로컬 실행:

```bash
npm install
npm run dev
```

빌드 후 실행:

```bash
npm run build
npm start
```

Docker Compose one-shot 실행:

```bash
docker compose up --build
```

컨테이너 이미지는 빌드 시 의존성 설치와 TypeScript 빌드를 끝내고, 실행 시에는 `npm start`만 수행합니다. `config.yml`만 읽기 전용으로 마운트한 뒤 브리핑 전송 후 종료됩니다.

## Behavior

브리핑 순서:

1. KST 기준 오늘 날짜 계산
2. Notion 데이터베이스에서 오늘 페이지 조회 또는 생성
3. D-day 계산
4. Open-Meteo에서 오늘 날씨 조회
5. Notion 데이터베이스에서 오늘 이후 일정 조회
6. ZenQuotes에서 오늘의 명언 조회
7. Discord webhook으로 단일 텍스트 메시지 전송

사용하는 외부 API:

- Open-Meteo
- Notion API
- ZenQuotes `https://zenquotes.io/api/today`

외부 API 일부가 실패하면 해당 섹션만 오류 문구로 대체하고 나머지는 전송합니다. `config.yml` 파싱/검증 실패와 Discord 전송 실패는 프로세스 전체 실패로 처리합니다.
