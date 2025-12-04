# AI 에러 로그 분석 시스템

AI 기반 에러 로그 분석 및 해결 방안 제시 시스템 (독립 실행 버전)

## 주요 기능

- 🔍 **에러 로그 자동 분석**: AI를 활용한 에러 로그 파일 분석
- 📊 **상세 분석 결과**: 에러 타입, 심각도, 발생 위치 등 상세 정보 제공
- 💡 **해결 방안 제시**: 에러의 원인 분석 및 조치 방법 제안
- 🛡️ **재발 방지책**: 에러 재발 방지를 위한 예방 조치 제안
- 💾 **에러 로그 저장**: 분석한 에러 로그를 데이터베이스에 저장
- 📅 **이력 관리**: 발생일자별로 그룹화하여 에러 로그 이력 조회

## 시스템 요구사항

### 필수 소프트웨어
- **Node.js**: v18 이상
- **Python**: v3.8 이상
- **npm**: Node.js와 함께 설치됨

### Python 의존성
```bash
pip install mcp anthropic
```

## 설치 방법

### 빠른 시작

```bash
# 1. 의존성 설치
npm install
pip install mcp anthropic

# 2. 환경 변수 설정 (.env 파일 생성)
PORT=3011
VITE_PORT=5183
VITE_API_BASE_URL=http://localhost:3011

# 3. 서버 실행
npm start
# 또는
start-dev-err-log.bat  # Windows
```

### 상세 설치 가이드

**다른 AI 시스템 (예: aipro)에 MCP 서버만 설치하려면:**
- [`docs/설치_및_구성_가이드.md`](docs/설치_및_구성_가이드.md)의 "MCP 서버 설치 및 구성" 섹션 참조

**전체 시스템 설치:**
- [`docs/설치_및_구성_가이드.md`](docs/설치_및_구성_가이드.md) 참조

## 실행 방법

### 개발 모드 (권장)

API 서버와 프론트엔드 서버를 동시에 실행:
```bash
npm start
```

또는 개별 실행:
```bash
# 터미널 1: API 서버 실행
npm run api-server

# 터미널 2: 프론트엔드 개발 서버 실행
npm run dev
```

### 접속

- **프론트엔드**: http://localhost:5183
- **API 서버**: http://localhost:3011

## 사용 방법

### 1. AI 에러로그분석

1. **AI 에러로그분석** 버튼 클릭
2. 에러 로그 파일 선택 또는 직접 입력
3. **분석 시작** 버튼 클릭
4. 분석 결과 확인 (에러 타입, 심각도, 원인, 해결 방안 등)
5. 필요시 **분석결과 저장하기** 버튼으로 데이터베이스에 저장

### 2. AI 에러로그 현황

1. **AI 에러로그 현황** 버튼 클릭
2. 발생일자별로 그룹화된 에러 로그 목록 확인
3. **상세보기** 버튼으로 각 에러의 상세 정보 확인
4. **새로고침** 버튼으로 최신 데이터 불러오기

## 프로젝트 구조

```
mcp_error_log_01/
├── src/                          # 프론트엔드 (Vue.js)
│   ├── App.vue                   # 메인 앱 컴포넌트
│   ├── main.js                   # Vue 앱 진입점
│   ├── style.css                 # 전역 스타일
│   ├── config/
│   │   └── api.js                # API 설정
│   ├── utils/
│   │   └── helpers.js            # 유틸리티 함수
│   └── components/
│       └── ErrorLogAnalysis.vue  # 에러 로그 분석 컴포넌트
│
├── data/                         # 데이터 저장소
│   └── database.db               # SQLite 데이터베이스 (자동 생성)
│
├── docs/                         # 문서
│   ├── 설치_및_구성_가이드.md   # 상세 설치 가이드 (MCP 구조 포함)
│   └── 사용자_가이드.md          # 사용자 매뉴얼
│
├── api-server.js                 # Node.js API 서버 (HTTP 서버)
├── database.js                   # SQLite 데이터베이스 유틸리티
├── mcp-error-log-analyzer.py    # Python MCP 서버 (핵심)
├── package.json                  # Node.js 의존성
├── vite.config.js               # Vite 빌드 설정
├── index.html                   # HTML 엔트리 포인트
├── start-dev-err-log.bat       # 개발 서버 시작 스크립트
├── .env                         # 환경 변수
└── README.md                    # 이 파일
```

### 시스템 아키텍처

```
프론트엔드 (Vue.js) → Node.js API 서버 → Python MCP 서버 → Anthropic Claude API
                    ↓
              SQLite 데이터베이스
```

**주요 구성 요소:**
- **프론트엔드**: Vue.js 기반 웹 UI
- **API 서버**: Node.js HTTP 서버 (포트 3011)
- **MCP 서버**: Python 기반 MCP 프로토콜 서버
- **데이터베이스**: SQLite (에러 로그 저장)

자세한 구조 설명은 [`docs/설치_및_구성_가이드.md`](docs/설치_및_구성_가이드.md)를 참조하세요.

## API 엔드포인트

### POST /api/error-log/analyze
에러 로그 분석 요청

**요청 본문:**
```json
{
  "log_content": "에러 로그 내용...",
  "log_file_path": "로그 파일 경로 (선택)",
  "workspace_path": "워크스페이스 경로 (선택)"
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "all_errors": [...],
      "detailed_summary": "...",
      ...
    }
  }
}
```

### POST /api/error-log/save
에러 로그 저장

**요청 본문:**
```json
{
  "log_content": "에러 로그 내용",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "parsed_data": {...},
  "system_type": "시스템 타입",
  "error_type": "에러 타입",
  "severity": "심각도"
}
```

### GET /api/error-log/history
에러 로그 이력 조회

**쿼리 파라미터:**
- `limit`: 조회 개수 (기본값: 100)
- `groupBy`: 그룹화 방식 (date: 발생일자별)

## 문서

- **[설치 및 구성 가이드](docs/설치_및_구성_가이드.md)**: 상세 설치 방법 및 MCP 서버 구조 설명
- **[MCP 서버 구조 가이드](docs/MCP_서버_구조.md)**: MCP 서버 상세 구조 및 다른 AI 시스템 통합 방법
- **[사용자 가이드](docs/사용자_가이드.md)**: 사용자 매뉴얼

## 문제 해결

### API 서버 연결 실패
- API 서버가 실행 중인지 확인: `npm run api-server`
- 포트 충돌 확인: `.env` 파일에서 포트 변경
- 방화벽 설정 확인

### Python 스크립트 실행 오류
- Python이 설치되어 있는지 확인: `python --version`
- Python 의존성 설치: `pip install mcp anthropic`
- 환경 변수 확인: `PYTHONIOENCODING=utf-8`

### 데이터베이스 오류
- `data` 폴더에 쓰기 권한이 있는지 확인
- `database.db` 파일이 손상되었다면 삭제 후 재시작 (자동 재생성됨)

### MCP 서버 관련 문제
- [MCP 서버 구조 가이드](docs/MCP_서버_구조.md)의 "문제 해결" 섹션 참조

## 라이선스

ISC

## 다른 AI 시스템에 설치하기

이 프로젝트의 **MCP 서버**는 다른 AI 시스템 (예: aipro, Claude Desktop 등)에서도 사용할 수 있습니다.

### 빠른 설치 (MCP 서버만)

1. **Python 의존성 설치**
   ```bash
   pip install mcp anthropic
   ```

2. **MCP 서버 파일 복사**
   ```bash
   cp mcp-error-log-analyzer.py /your/mcp/servers/
   ```

3. **AI 시스템 설정 파일에 등록**
   - 각 AI 시스템의 MCP 설정 방법에 따라 등록
   - 자세한 내용은 [MCP 서버 구조 가이드](docs/MCP_서버_구조.md) 참조

### 전체 시스템 설치

웹 UI와 데이터베이스 기능을 포함한 전체 시스템 설치:
- [설치 및 구성 가이드](docs/설치_및_구성_가이드.md) 참조

## 지원

문제가 발생하거나 기능 개선 제안이 있으시면 이슈를 등록해주세요.

