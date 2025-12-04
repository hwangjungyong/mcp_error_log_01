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

## 추가 리소스

- **MCP 공식 문서**: https://modelcontextprotocol.io/
- **프로젝트 설치 가이드**: [`설치_및_구성_가이드.md`](설치_및_구성_가이드.md)
- **사용자 가이드**: [`사용자_가이드.md`](사용자_가이드.md)

---

**마지막 업데이트**: 2025년 12월

