# MCP 서버 구조 상세 가이드

## 개요

이 문서는 AI 에러 로그 분석 시스템의 **MCP (Model Context Protocol) 서버 구조**를 상세히 설명합니다. 다른 AI 시스템 (예: aipro, Claude Desktop 등)에 MCP 서버를 설치하거나 통합할 때 참고하세요.

## MCP 서버란?

**MCP (Model Context Protocol)**는 AI 모델과 외부 도구/서비스를 연결하는 표준 프로토콜입니다. 이 프로젝트는 Python으로 구현된 MCP 서버를 포함하고 있으며, 다음과 같은 특징이 있습니다:

- **표준 프로토콜**: MCP 표준을 따르므로 다양한 AI 시스템에서 사용 가능
- **표준 입출력 통신**: stdin/stdout을 통한 JSON-RPC 통신
- **독립 실행 가능**: 다른 프로젝트와 독립적으로 실행 가능

## 파일 구조

### 핵심 파일

```
mcp_error_log_01/
├── mcp-error-log-analyzer.py    # Python MCP 서버 (핵심)
├── api-server.js                 # Node.js API 서버 (선택사항)
└── database.js                   # 데이터베이스 유틸리티 (선택사항)
```

### MCP 서버만 사용하는 경우

**필수 파일:**
- `mcp-error-log-analyzer.py` (MCP 서버)

**필수 의존성:**
- Python 3.8 이상
- `mcp` 패키지
- `anthropic` 패키지 (Claude API 사용)

## MCP 서버 구조

### 1. 초기화 및 설정

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import sys
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# MCP 서버 생성
app = Server("error-log-analyzer")

# Windows 콘솔 인코딩 설정 (UTF-8)
if sys.platform == 'win32':
    import io
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
```

### 2. 도구(Tool) 등록

```python
@app.list_tools()
async def list_tools() -> list[Tool]:
    """등록된 도구 목록 반환"""
    return [
        Tool(
            name="analyze_error_log",
            description="에러 로그를 분석하고 해결 방안을 제시합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "log_content": {
                        "type": "string",
                        "description": "분석할 에러 로그 내용"
                    },
                    "log_file_path": {
                        "type": "string",
                        "description": "로그 파일 경로 (선택사항)"
                    }
                },
                "required": ["log_content"]
            }
        )
    ]
```

### 3. 도구 실행 핸들러

```python
@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """도구 실행 핸들러"""
    if name == "analyze_error_log":
        log_content = arguments.get("log_content", "")
        log_file_path = arguments.get("log_file_path", None)
        
        # 에러 로그 분석 로직
        result = await analyze_error_log(log_content, log_file_path)
        
        # JSON 결과 반환
        json_output = json.dumps(result, ensure_ascii=False, indent=2)
        return [
            TextContent(
                type="text",
                text=f"<JSON_START>{json_output}<JSON_END>"
            )
        ]
```

### 4. 서버 실행

```python
async def main():
    """MCP 서버 실행"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

## 통신 프로토콜

### 요청 형식 (JSON-RPC)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_error_log",
    "arguments": {
      "log_content": "에러 로그 내용...",
      "log_file_path": "경로 (선택사항)"
    }
  }
}
```

### 응답 형식 (JSON-RPC)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "<JSON_START>{...분석 결과 JSON...}<JSON_END>"
      }
    ]
  }
}
```

### 분석 결과 JSON 구조

```json
{
  "log_type": "application",
  "system_type": "application",
  "error_type": "Database Error",
  "error_category": "Connection Error",
  "severity": "ERROR",
  "summary": "총 1개의 에러가 발견되었습니다...",
  "root_cause": "데이터베이스 연결 타임아웃...",
  "solutions": [
    {
      "title": "해결 방안 1",
      "description": "설명...",
      "steps": ["단계 1", "단계 2"],
      "code_example": "코드 예시..."
    }
  ],
  "metadata": {
    "total_errors": 1,
    "all_errors": [...],
    "error_statistics": {...}
  },
  "original_log": "원본 로그 내용..."
}
```

## 다른 AI 시스템에 설치하기

### Claude Desktop

**설정 파일 위치:**
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**설정 예시:**
```json
{
  "mcpServers": {
    "error-log-analyzer": {
      "command": "python",
      "args": [
        "C:\\path\\to\\mcp-error-log-analyzer.py"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### aipro

aipro의 MCP 설정 방법에 따라:

1. **MCP 서버 디렉토리에 파일 복사**
   ```bash
   cp mcp-error-log-analyzer.py /aipro/mcp-servers/
   ```

2. **aipro 설정 파일에 등록**
   - aipro의 설정 파일 형식에 맞게 MCP 서버 등록
   - Python 경로 및 환경 변수 설정

3. **aipro 재시작**
   - 설정 변경 후 aipro 재시작
   - MCP 서버가 자동으로 로드됨

### 독립 실행 (Node.js API 서버와 함께)

**전체 시스템 설치:**
```bash
# 1. 프로젝트 복제
git clone <repository-url>
cd mcp_error_log_01

# 2. 의존성 설치
npm install
pip install mcp anthropic

# 3. 환경 변수 설정
echo "PORT=3011" > .env
echo "VITE_PORT=5183" >> .env

# 4. 서버 실행
npm start
```

**접속:**
- 프론트엔드: http://localhost:5183
- API 서버: http://localhost:3011

## Node.js에서 MCP 서버 호출

### spawn을 사용한 통신

```javascript
import { spawn } from 'child_process';
import { join } from 'path';

const pythonScript = join(__dirname, 'mcp-error-log-analyzer.py');

// Python 프로세스 실행
const pythonProcess = spawn('python', [pythonScript], {
  stdio: ['pipe', 'pipe', 'pipe'],
  encoding: 'utf-8'
});

// 요청 전송
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'analyze_error_log',
    arguments: {
      log_content: '에러 로그 내용...'
    }
  }
};

pythonProcess.stdin.write(JSON.stringify(request) + '\n');

// 응답 수신
let output = '';
pythonProcess.stdout.on('data', (data) => {
  output += data.toString();
  
  // JSON 결과 추출
  const jsonMatch = output.match(/<JSON_START>([\s\S]*?)<JSON_END>/);
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[1]);
      console.log('분석 결과:', result);
    } catch (e) {
      console.error('JSON 파싱 오류:', e);
    }
  }
});

// 에러 처리
pythonProcess.stderr.on('data', (data) => {
  console.error('Python 오류:', data.toString());
});

pythonProcess.on('close', (code) => {
  console.log(`Python 프로세스 종료: ${code}`);
});
```

## 환경 변수

### 필수 환경 변수

- **ANTHROPIC_API_KEY**: Anthropic Claude API 키 (필수)
  ```bash
  export ANTHROPIC_API_KEY="sk-ant-..."
  ```

### 선택 환경 변수

- **PYTHONIOENCODING**: Python 입출력 인코딩 (Windows에서 권장)
  ```bash
  export PYTHONIOENCODING=utf-8
  ```

## 문제 해결

### MCP 서버가 시작되지 않음

1. **Python 버전 확인**
   ```bash
   python --version  # 3.8 이상 필요
   ```

2. **의존성 설치 확인**
   ```bash
   pip list | grep mcp
   pip list | grep anthropic
   ```

3. **파일 권한 확인**
   ```bash
   ls -l mcp-error-log-analyzer.py
   chmod +x mcp-error-log-analyzer.py  # 실행 권한 부여
   ```

### JSON 결과를 추출할 수 없음

1. **출력 확인**
   - Python 프로세스의 stdout/stderr 확인
   - `<JSON_START>...<JSON_END>` 마커 확인

2. **인코딩 확인**
   - UTF-8 인코딩 설정 확인
   - Windows에서 `PYTHONIOENCODING=utf-8` 설정

3. **에러 로그 확인**
   - Python 스크립트의 stderr 출력 확인
   - API 키 및 네트워크 연결 확인

## 사용자 질문 처리 플로우

### 질문 예시

사용자가 AI 시스템(예: Claude, aipro 등)에 다음과 같이 질문합니다:

```
error log mcp를 이용하여 아래의 에러로그를 확인해줘

[2025-12-20 09:40:15] ERROR: Python MCP server error
Traceback (most recent call last):
  File "mcp-error-log-analyzer.py", line 234, in run_direct_analysis
    parser = LogParser(log_content)
  File "mcp-error-log-analyzer.py", line 95, in __init__
    self.log_content = log_content
TypeError: expected str, bytes or os.PathLike object, not NoneType
```

### 처리 플로우 상세

#### 1단계: AI 시스템이 MCP 도구 호출

**처리:**
- AI 시스템이 사용자 질문을 분석
- MCP 서버에 등록된 도구 목록 확인 (`list_tools()` 호출)
- `analyze_error_logs` 도구가 적합하다고 판단
- JSON-RPC 형식으로 도구 호출 요청 전송

**수집되는 정보:**
- 사용자 질문 내용
- 에러 로그 텍스트 (질문에 포함된 로그)
- 워크스페이스 경로 (선택사항)

**액션:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "analyze_error_logs",
    "arguments": {
      "log_content": "[2025-12-20 09:40:15] ERROR: Python MCP server error\nTraceback..."
    }
  }
}
```

#### 2단계: MCP 서버 도구 실행 핸들러 호출

**처리:**
- MCP 서버의 `@server.call_tool()` 데코레이터가 요청 수신
- `analyze_error_logs` 도구 실행 핸들러 호출
- 인자 파싱: `log_content`, `log_file_path`, `workspace_path`

**수집되는 정보:**
- 로그 내용 (직접 입력 또는 파일 경로)
- 워크스페이스 경로 (기본값: 현재 작업 디렉토리)
- 로그 소스 타입 (직접 입력 / 파일 경로 / 자동 검색)

**액션:**
```python
if name == "analyze_error_logs":
    log_content = arguments.get("log_content")  # 직접 입력된 로그
    log_file_path = arguments.get("log_file_path")
    workspace_path = arguments.get("workspace_path", os.getcwd())
```

#### 3단계: 로그 타입 감지 및 파싱

**처리:**
- `LogParser` 클래스 인스턴스 생성
- 로그 타입 자동 감지:
  - GCP JSON 로그
  - GCP 텍스트 로그
  - AWS CloudWatch 로그
  - Azure Monitor 로그
  - 일반 애플리케이션 로그
- 정규표현식 패턴 매칭으로 에러 추출

**수집되는 정보:**
- 로그 타입 (`gcp_json`, `gcp_text`, `aws`, `azure`, `application` 등)
- 각 에러의 타임스탬프
- 에러 심각도 (ERROR, WARNING, CRITICAL 등)
- 에러 메시지
- 발생 위치 (파일 경로, 라인 번호)
- 리소스 정보 (서비스명, 리소스 타입 등)

**액션:**
```python
parser = LogParser(log_content)
errors = parser.parse_errors()  # 구조화된 에러 리스트 반환
```

**파싱 결과 예시:**
```python
[
  {
    "timestamp": "2025-12-20 09:40:15",
    "severity": "ERROR",
    "message": "Python MCP server error\nTraceback...",
    "log_content": "전체 에러 로그 내용",
    "location": "mcp-error-log-analyzer.py:95",
    "metadata": {...}
  }
]
```

#### 4단계: 에러 분석 및 분류

**처리:**
- `ErrorAnalyzer` 클래스를 사용하여 각 에러 분석
- 에러 타입 분류:
  - Database Error
  - Network Error
  - Security Error
  - File System Error
  - Performance Error
  - Code Error
  - Configuration Error
- 키워드 매칭 및 패턴 분석

**수집되는 정보:**
- 에러 타입 (`error_type`)
- 에러 카테고리 (`error_category`)
- 매칭된 키워드 (`matched_keywords`)
- 에러 코드 (`error_code`)
- 파일 경로 및 라인 번호 (`file_path`, `line_number`)
- 데이터베이스 정보 (호스트, 사용자, 쿼리 등)
- 네트워크 정보 (URL, 포트, 타임아웃 등)
- 보안 정보 (토큰, 권한 등)

**액션:**
```python
analyzer = ErrorAnalyzer()
for error in errors:
    analysis = analyzer.analyze_error(error['message'])
    error['error_type'] = analysis['error_type']
    error['error_category'] = analysis['error_category']
    error['analysis'] = analysis
```

#### 5단계: 워크스페이스 검색 (발생 위치 찾기)

**처리:**
- `WorkspaceSearcher` 클래스를 사용하여 워크스페이스에서 관련 파일/함수 검색
- 에러 메시지의 파일명, 함수명, 클래스명 추출
- 워크스페이스 내 파일 시스템 검색
- 코드 스니펫 추출

**수집되는 정보:**
- 발견된 파일 목록 (`files`)
  - 파일 경로 (상대 경로, 절대 경로)
  - 라인 번호
  - 코드 스니펫
- 발견된 함수/클래스 목록 (`functions`)
  - 함수/클래스 이름
  - 파일 경로 및 라인 번호
  - 코드 스니펫
- 수정 제안 (`suggestions`)

**액션:**
```python
workspace_searcher = WorkspaceSearcher(workspace_path)
for error in errors:
    locations = workspace_searcher.find_error_location(error['message'])
    # locations['files'], locations['functions'] 반환
```

#### 6단계: AI 기반 상세 분석 (Claude API 호출)

**처리:**
- Anthropic Claude API를 사용한 고급 분석
- 각 에러에 대한 상세 메타데이터 생성:
  - 원인 분석 (`root_cause`)
  - 해결 방안 (`solutions`)
  - 재발 방지책 (`prevention_strategies`)
  - 영향도 분석 (`impact_level`)

**수집되는 정보:**
- 원인 분석 텍스트
- 해결 방안 목록 (단계별 가이드 포함)
- 재발 방지 전략
- 영향도 레벨 (HIGH/MEDIUM/LOW)
- 에러 통계 (타입별, 카테고리별 분포)

**액션:**
```python
# 각 에러에 대한 메타데이터 생성
metadata = parser._extract_metadata(error)
metadata['root_cause'] = parser._generate_root_cause(...)
metadata['solutions'] = [...]  # AI 생성
metadata['impact_level'] = parser._analyze_impact(...)
```

#### 7단계: 결과 포맷팅 및 반환

**처리:**
- 분석 결과를 구조화된 형식으로 포맷팅
- 마크다운 형식의 텍스트 결과 생성
- JSON 형식의 구조화된 데이터 생성
- `<JSON_START>...<JSON_END>` 마커로 JSON 결과 표시

**생성되는 결과:**

**1. 텍스트 결과 (마크다운 형식):**
```
## 1. 에러 로그 요약 (테이블) - 최신순
| 번호 | 발생일시 | 심각도 | 에러사항 | 발생위치 |
|------|----------|--------|----------|----------|
| 1 | 2025-12-20 09:40:15 | ERROR | Python MCP server error | mcp-error-log-analyzer.py:95 |

## 2. 에러 분석 (테이블)
...

## 3. 워크스페이스에서 발생 위치 검색
### 발견된 파일:
- **mcp-error-log-analyzer.py:95**
```python
self.log_content = log_content
```

## 4. 상세 에러 내역
### 에러 #1
- **발생일시**: 2025-12-20 09:40:15
- **심각도**: ERROR
- **에러사항**: TypeError: expected str, bytes or os.PathLike object, not NoneType
- **발생위치**: mcp-error-log-analyzer.py:95

## 5. 조치 방법
### CODE ERROR 타입 에러 조치 방법:
1. log_content 파라미터가 None인지 확인
2. 함수 호출 시 유효한 문자열 전달 확인
3. None 체크 로직 추가

## 6. 수정 가이드
...
```

**2. JSON 결과 (구조화된 데이터):**
```json
{
  "log_type": "application",
  "system_type": "application",
  "error_type": "Code Error",
  "error_category": "Code",
  "severity": "ERROR",
  "summary": "총 1개의 에러가 발견되었습니다...",
  "root_cause": "log_content 파라미터가 None으로 전달되어 TypeError 발생...",
  "solutions": [
    {
      "title": "None 체크 추가",
      "description": "log_content가 None인 경우 기본값 설정",
      "steps": ["파라미터 검증 로직 추가", "기본값 설정"],
      "code_example": "if log_content is None:\n    log_content = ''"
    }
  ],
  "metadata": {
    "total_errors": 1,
    "all_errors": [...],
    "error_statistics": {...}
  },
  "original_log": "원본 로그 내용..."
}
```

**액션:**
```python
# 텍스트 결과 생성
result_parts = []
result_parts.append(format_error_table(errors))
result_parts.append(format_analysis_table(analysis_results))
# ... 기타 섹션 추가

# JSON 결과 생성
json_output = json.dumps({
    'log_type': ...,
    'error_type': ...,
    'solutions': ...,
    'metadata': {...}
}, ensure_ascii=False, indent=2)

# stdout에 JSON 출력 (API 서버에서 추출 가능)
print(f"<JSON_START>{json_output}<JSON_END>", file=sys.stdout)

# 텍스트 결과 반환
return [TextContent(
    type="text",
    text="\n".join(result_parts)
)]
```

#### 8단계: AI 시스템에 결과 전달

**처리:**
- MCP 서버가 JSON-RPC 형식으로 응답 반환
- AI 시스템이 결과를 수신하고 사용자에게 표시
- 사용자는 분석 결과, 해결 방안, 수정 가이드를 확인

**수집되는 정보:**
- 전체 분석 결과 (텍스트 + JSON)
- AI 시스템의 응답 히스토리
- 사용자 피드백 (선택사항)

**액션:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "## 1. 에러 로그 요약...\n\n<JSON_START>{...}<JSON_END>"
      }
    ]
  }
}
```

### 전체 플로우 다이어그램

```
사용자 질문
    ↓
AI 시스템 (Claude/aipro 등)
    ↓
MCP 서버 도구 호출 (JSON-RPC)
    ↓
[1] 도구 실행 핸들러
    ↓
[2] 로그 타입 감지 및 파싱 (LogParser)
    ↓
[3] 에러 분석 및 분류 (ErrorAnalyzer)
    ↓
[4] 워크스페이스 검색 (WorkspaceSearcher)
    ↓
[5] AI 기반 상세 분석 (Claude API)
    ↓
[6] 결과 포맷팅 (텍스트 + JSON)
    ↓
[7] MCP 서버 응답 반환 (JSON-RPC)
    ↓
AI 시스템이 사용자에게 결과 표시
```

### 수집되는 정보 요약

**로그 정보:**
- 로그 타입 및 형식
- 에러 개수 및 분포
- 타임스탬프 정보

**에러 정보:**
- 에러 타입 및 카테고리
- 심각도 레벨
- 에러 메시지 및 스택 트레이스
- 발생 위치 (파일, 라인)

**분석 정보:**
- 원인 분석
- 해결 방안 (단계별)
- 재발 방지책
- 영향도 평가

**코드 정보:**
- 관련 파일 경로
- 함수/클래스 위치
- 코드 스니펫
- 수정 제안

**통계 정보:**
- 에러 타입별 분포
- 카테고리별 분포
- 심각도별 분포
- 시간대별 발생 패턴

## 추가 리소스

- **MCP 공식 문서**: https://modelcontextprotocol.io/
- **프로젝트 설치 가이드**: [`설치_및_구성_가이드.md`](설치_및_구성_가이드.md)
- **사용자 가이드**: [`사용자_가이드.md`](사용자_가이드.md)

---

**마지막 업데이트**: 2025년 12월

