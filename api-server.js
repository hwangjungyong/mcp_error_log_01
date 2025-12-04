#!/usr/bin/env node

/**
 * AI 에러 로그 분석 API 서버
 * 
 * 주요 기능:
 * - 에러 로그 분석 (Python MCP 서버 연동)
 * - 에러 로그 저장
 * - 에러 로그 이력 조회
 */

import http from 'http';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { init as initDB, errorLogsDB } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

// 환경 변수에서 포트 설정 (기본값: 3011)
const PORT = process.env.PORT || 3011;

// JSON 응답 전송 헬퍼 함수
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // ==================== 에러 로그 분석 API ====================
  if (req.method === 'POST' && req.url === '/api/error-log/analyze') {
    console.log('[API 서버] 에러 로그 분석 요청 수신');
    
    let body = '';
    const maxBodySize = 10 * 1024 * 1024; // 10MB 제한
    let bodySize = 0;
    
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > maxBodySize) {
        console.error('[API 서버] 요청 본문 크기 초과:', bodySize);
        return sendJSON(res, 413, { 
          success: false,
          error: '요청 본문이 너무 큽니다. (10MB 초과)'
        });
      }
      body += chunk.toString('utf-8');
    });
    
    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body);
        const { log_file_path, log_content, workspace_path } = requestData;
        
        console.log('[API 서버] 요청 데이터:', { 
          log_file_path, 
          has_log_content: !!log_content, 
          workspace_path 
        });
        
        // Python 스크립트 실행
        const pythonScript = join(__dirname, 'mcp-error-log-analyzer.py');
        
        // Python 스크립트 파일 존재 여부 확인
        const fs = await import('fs');
        const fsModule = fs.default || fs;
        if (!fsModule.existsSync(pythonScript)) {
          console.error('[API 서버] Python 스크립트 파일을 찾을 수 없습니다:', pythonScript);
          return sendJSON(res, 500, {
            success: false,
            error: `Python 스크립트 파일을 찾을 수 없습니다: ${pythonScript}`,
            suggestion: 'mcp-error-log-analyzer.py 파일이 프로젝트 루트에 있는지 확인하세요.'
          });
        }
        
        let command = `python "${pythonScript}"`;
        if (log_content) {
          // 직접 입력된 로그는 임시 파일에 저장
          const tempFile = join(__dirname, 'temp_error_log.txt');
          fsModule.writeFileSync(tempFile, log_content, 'utf-8');
          command += ` --log-file "${tempFile}"`;
        } else if (log_file_path) {
          command += ` --log-file "${log_file_path}"`;
        }
        if (workspace_path) {
          command += ` --workspace "${workspace_path}"`;
        } else {
          command += ` --workspace "${__dirname}"`;
        }
        
        console.log('[API 서버] 실행 명령어:', command);
        console.log('[API 서버] 에러 로그 분석 시작');
        
        const startTime = Date.now();
        let stdout, stderr;
        
        try {
          // Windows에서 UTF-8 인코딩 보장
          const env = process.platform === 'win32' 
            ? { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONLEGACYWINDOWSSTDIO: '0' }
            : process.env;
          
          const result = await execAsync(command, {
            cwd: __dirname,
            maxBuffer: 50 * 1024 * 1024, // 50MB
            timeout: 60000, // 60초
            env: env,
            encoding: 'utf-8'
          });
          stdout = result.stdout;
          stderr = result.stderr;
        } catch (execError) {
          console.error('[API 서버] Python 스크립트 실행 오류:', execError.message);
          stderr = execError.stderr || execError.message;
          stdout = execError.stdout || '';
        }
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[API 서버] 에러 로그 분석 완료 (소요 시간: ${duration}초)`);
        
        // 디버깅: stdout과 stderr 출력
        console.log('[API 서버] stdout 길이:', stdout?.length || 0);
        console.log('[API 서버] stderr 길이:', stderr?.length || 0);
        if (stdout) {
          console.log('[API 서버] stdout 처음 500자:', stdout.substring(0, 500));
        }
        if (stderr) {
          console.log('[API 서버] stderr 처음 500자:', stderr.substring(0, 500));
        }
        
        // JSON 데이터 추출 (<JSON_START>...</JSON_END> 형식)
        let jsonData = null;
        const allOutput = (stdout || '') + (stderr || '');
        
        // 여러 패턴 시도
        let jsonStartMatch = allOutput.match(/<JSON_START>([\s\S]*?)<JSON_END>/);
        
        // 패턴 1 실패 시 다른 패턴 시도
        if (!jsonStartMatch) {
          // JSON_START/JSON_END가 여러 줄에 걸쳐 있을 수 있음
          jsonStartMatch = allOutput.match(/<JSON_START>([\s\S]*?)<JSON_END>/m);
        }
        
        // 패턴 2 실패 시 마지막 JSON 객체 찾기 시도
        if (!jsonStartMatch) {
          // 전체 출력에서 마지막 JSON 객체 찾기
          const jsonMatches = allOutput.match(/\{[\s\S]*\}/g);
          if (jsonMatches && jsonMatches.length > 0) {
            // 가장 긴 JSON 객체 선택 (일반적으로 마지막이 전체 결과)
            const lastJson = jsonMatches[jsonMatches.length - 1];
            try {
              jsonData = JSON.parse(lastJson);
              console.log('[API 서버] JSON_START/JSON_END 없이 JSON 추출 성공 (마지막 JSON 객체 사용)');
            } catch (e) {
              console.error('[API 서버] 마지막 JSON 객체 파싱 실패:', e.message);
            }
          }
        }
        
        if (jsonStartMatch) {
          try {
            const jsonString = jsonStartMatch[1].trim();
            console.log('[API 서버] 추출된 JSON 문자열 길이:', jsonString.length);
            console.log('[API 서버] 추출된 JSON 처음 200자:', jsonString.substring(0, 200));
            
            jsonData = JSON.parse(jsonString);
            console.log('[API 서버] JSON 데이터 추출 성공');
            
            if (jsonData.metadata && jsonData.metadata.all_errors) {
              console.log(`[API 서버] ${jsonData.metadata.all_errors.length}개 에러 발견`);
            }
          } catch (e) {
            console.error('[API 서버] JSON 파싱 오류:', e.message);
            console.error('[API 서버] JSON 파싱 오류 상세:', e);
            // 파싱 실패 시 원본 문자열 일부 출력
            if (jsonStartMatch[1]) {
              console.error('[API 서버] 파싱 실패한 JSON 문자열 (처음 500자):', jsonStartMatch[1].substring(0, 500));
            }
          }
        }
        
        // 결과 반환
        if (jsonData) {
          return sendJSON(res, 200, {
            success: true,
            result: jsonData,  // 프론트엔드가 기대하는 형식
            data: jsonData,    // 호환성을 위해 유지
            metadata: {
              analysis_duration: duration,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          // 더 자세한 오류 정보 제공
          const errorInfo = {
            error: 'Python 스크립트에서 JSON 결과를 추출할 수 없습니다.',
            stdout_length: stdout?.length || 0,
            stderr_length: stderr?.length || 0,
            stdout_preview: stdout ? stdout.substring(0, 1000) : '',
            stderr_preview: stderr ? stderr.substring(0, 1000) : '',
            has_json_start: allOutput.includes('<JSON_START>'),
            has_json_end: allOutput.includes('<JSON_END>'),
            output_length: allOutput.length
          };
          
          console.error('[API 서버] JSON 추출 실패 상세:', errorInfo);
          
          return sendJSON(res, 500, {
            success: false,
            ...errorInfo
          });
        }
        
      } catch (error) {
        console.error('[API 서버] 에러 로그 분석 오류:', error);
        return sendJSON(res, 500, {
          success: false,
          error: error.message
        });
      }
    });
    return;
  }

  // ==================== 에러 로그 저장 API ====================
  if (req.method === 'POST' && req.url === '/api/error-log/save') {
    console.log('[API 서버] 에러 로그 저장 요청 수신');
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf-8');
    });
    
    req.on('end', async () => {
      try {
        const saveData = JSON.parse(body);
        console.log('[API 서버] 저장 요청 데이터:', {
          log_content_length: saveData.log_content?.length,
          timestamp: saveData.timestamp,
          error_type: saveData.error_type,
          system_type: saveData.system_type
        });
        
        // 데이터베이스에 저장
        const savedLog = errorLogsDB.create(saveData);
        
        console.log('[API 서버] 에러 로그 저장 완료:', {
          id: savedLog.id,
          timestamp: savedLog.timestamp,
          created_at: savedLog.created_at
        });
        
        return sendJSON(res, 200, {
          success: true,
          message: '에러 로그가 성공적으로 저장되었습니다.',
          data: savedLog
        });
        
      } catch (error) {
        console.error('[API 서버] 에러 로그 저장 오류:', error);
        return sendJSON(res, 500, {
          success: false,
          error: error.message
        });
      }
    });
    return;
  }

  // ==================== 에러 로그 전체 삭제 API ====================
  if (req.method === 'DELETE' && req.url === '/api/error-log/delete-all') {
    console.log('[API 서버] 에러 로그 전체 삭제 요청');
    
    try {
      const result = errorLogsDB.deleteAll();
      
      console.log('[API 서버] 에러 로그 전체 삭제 완료');
      
      return sendJSON(res, 200, {
        success: true,
        message: '모든 에러 로그가 삭제되었습니다.',
        deletedCount: result.deletedCount
      });
      
    } catch (error) {
      console.error('[API 서버] 에러 로그 전체 삭제 오류:', error);
      return sendJSON(res, 500, {
        success: false,
        error: error.message
      });
    }
  }

  // ==================== 에러 로그 이력 조회 API ====================
  if (req.method === 'GET' && req.url.startsWith('/api/error-log/history')) {
    console.log('[API 서버] 에러 로그 이력 조회 요청');
    
    try {
      // 쿼리 파라미터 파싱
      const url = new URL(req.url, `http://${req.headers.host}`);
      const limit = parseInt(url.searchParams.get('limit') || '100');
      // groupBy 또는 group_by_date 파라미터 지원
      const groupByParam = url.searchParams.get('groupBy');
      const groupByDateParam = url.searchParams.get('group_by_date');
      
      let groupBy = 'date'; // 기본값
      if (groupByParam === 'none' || groupByParam === 'false') {
        groupBy = 'none';
      } else if (groupByParam === 'date' || groupByDateParam === 'true') {
        groupBy = 'date';
      } else if (groupByParam) {
        groupBy = groupByParam;
      }
      
      // 데이터베이스에서 조회
      const logs = errorLogsDB.findAll(limit, {}, groupBy === 'date');
      
      console.log('[API 서버] 에러 로그 조회 완료:', {
        logs_length: logs.length,
        groupByDate: groupBy === 'date'
      });
      
      if (groupBy === 'date' && Array.isArray(logs)) {
        logs.forEach((group, i) => {
          console.log(`[API 서버] 그룹 ${i + 1}: date=${group.date}, count=${group.count}`);
        });
      }
      
      return sendJSON(res, 200, {
        success: true,
        result: logs,  // 프론트엔드가 기대하는 형식
        data: logs,    // 호환성을 위해 유지
        metadata: {
          total: Array.isArray(logs) ? logs.length : 0,
          grouped: groupBy === 'date',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[API 서버] 에러 로그 이력 조회 오류:', error);
      return sendJSON(res, 500, {
        success: false,
        error: error.message
      });
    }
  }

  // ==================== 404 응답 ====================
  sendJSON(res, 404, {
    success: false,
    error: '요청한 엔드포인트를 찾을 수 없습니다.'
  });
});

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 초기화
    console.log('[API 서버] 데이터베이스 초기화 중...');
    await initDB();
    console.log('[API 서버] 데이터베이스 초기화 완료');
    
    // HTTP 서버 시작
    server.listen(PORT, () => {
      console.log(`[API 서버] HTTP 서버 시작 - 포트: ${PORT}`);
      console.log(`[API 서버] http://localhost:${PORT}`);
      console.log('[API 서버] 사용 가능한 엔드포인트:');
      console.log('  - POST   /api/error-log/analyze    : 에러 로그 분석');
      console.log('  - POST   /api/error-log/save       : 에러 로그 저장');
      console.log('  - GET    /api/error-log/history    : 에러 로그 이력 조회');
      console.log('  - DELETE /api/error-log/delete-all  : 에러 로그 전체 삭제');
    });
  } catch (error) {
    console.error('[API 서버] 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

