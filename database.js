#!/usr/bin/env node

/**
 * 데이터베이스 유틸리티 - SQLite 기반 (sql.js 사용)
 * 
 * 역할:
 * - SQLite 데이터베이스를 사용한 에러 로그 데이터 저장 및 조회
 * - 순수 JavaScript 기반 (네이티브 모듈 불필요)
 * - 에러 로그 데이터 관리
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 파일 경로
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'database.db');

// SQLite 인스턴스
let SQL;
let db = null;

// 데이터베이스 초기화
async function initDatabase() {
  try {
    // 데이터 디렉토리 생성
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    // SQL.js 초기화
    const sqlJsPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist');
    SQL = await initSqlJs({
      locateFile: (file) => path.join(sqlJsPath, file)
    });

    // 데이터베이스 파일이 있으면 로드, 없으면 새로 생성
    if (fs.existsSync(DB_FILE)) {
      const buffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(buffer);
      console.log('[DB] 기존 데이터베이스 로드 완료');
    } else {
      db = new SQL.Database();
      console.log('[DB] 새 데이터베이스 생성 완료');
    }

    // 테이블 생성
    createTables();
    
    console.log('[DB] 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('[DB] 데이터베이스 초기화 오류:', error);
    throw error;
  }
}

// 테이블 생성
function createTables() {
  const tables = [
    // 에러 로그 테이블
    `CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_content TEXT NOT NULL,
      log_type TEXT,
      parsed_data TEXT,
      system_type TEXT,
      severity TEXT,
      resource_type TEXT,
      service_name TEXT,
      file_path TEXT,
      line_number INTEGER,
      error_type TEXT,
      error_category TEXT,
      timestamp TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`,
    
    // 에러 로그 메타정보 테이블
    `CREATE TABLE IF NOT EXISTS error_log_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_log_id INTEGER NOT NULL,
      error_type TEXT,
      error_category TEXT,
      impact_level TEXT,
      occurred_at TEXT,
      system_type TEXT,
      severity TEXT,
      resource_type TEXT,
      service_name TEXT,
      file_path TEXT,
      line_number INTEGER,
      analysis_data TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (error_log_id) REFERENCES error_logs(id) ON DELETE CASCADE
    )`
  ];

  tables.forEach(sql => {
    db.run(sql);
  });
}

// 데이터베이스 저장
function saveDatabase() {
  try {
    if (!db) {
      console.error('[DB] 데이터베이스가 초기화되지 않았습니다.');
      return;
    }
    
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (error) {
    console.error('[DB] 데이터베이스 저장 오류:', error);
  }
}

// 데이터베이스 초기화 (비동기)
let initPromise = null;
export async function init() {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

// 에러 로그 관련 함수
export const errorLogsDB = {
  // 모든 에러 로그 조회 (최신순, 메타정보 포함)
  // groupByDate: true인 경우 발생일자별로 그룹화하여 반환
  findAll(limit = 100, filters = {}, groupByDate = false) {
    let sql = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];
    
    // 필터 추가
    if (filters.system_type) {
      sql += ' AND system_type = ?';
      params.push(filters.system_type);
    }
    if (filters.severity) {
      sql += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.error_type) {
      sql += ' AND error_type = ?';
      params.push(filters.error_type);
    }
    if (filters.start_date) {
      sql += ' AND timestamp >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      sql += ' AND timestamp <= ?';
      params.push(filters.end_date);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    console.log(`[데이터베이스] 조회 쿼리: ${sql}`);
    console.log(`[데이터베이스] 조회 파라미터:`, params);
    
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const logs = [];
    let rowCount = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      rowCount++;
      console.log(`[데이터베이스] 조회된 로그 ${rowCount}: ID=${row.id}, timestamp=${row.timestamp}, created_at=${row.created_at}`);
      
      // 메타정보 조회 (순환 참조 방지를 위해 직접 조회)
      let metadata = null;
      const metadataStmt = db.prepare('SELECT * FROM error_log_metadata WHERE error_log_id = ? ORDER BY created_at DESC LIMIT 1');
      metadataStmt.bind([row.id]);
      if (metadataStmt.step()) {
        const metadataRow = metadataStmt.getAsObject();
        metadata = {
          id: metadataRow.id,
          error_log_id: metadataRow.error_log_id,
          error_type: metadataRow.error_type,
          error_category: metadataRow.error_category,
          impact_level: metadataRow.impact_level,
          occurred_at: metadataRow.occurred_at,
          system_type: metadataRow.system_type,
          severity: metadataRow.severity,
          resource_type: metadataRow.resource_type,
          service_name: metadataRow.service_name,
          file_path: metadataRow.file_path,
          line_number: metadataRow.line_number,
          analysis_data: metadataRow.analysis_data ? JSON.parse(metadataRow.analysis_data) : null,
          created_at: metadataRow.created_at,
          updated_at: metadataRow.updated_at
        };
      }
      metadataStmt.free();
      
      logs.push({
        id: row.id,
        log_content: row.log_content,
        log_type: row.log_type,
        parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null,
        system_type: row.system_type,
        severity: row.severity,
        resource_type: row.resource_type,
        service_name: row.service_name,
        file_path: row.file_path,
        line_number: row.line_number,
        error_type: row.error_type,
        error_category: row.error_category,
        timestamp: row.timestamp,
        created_at: row.created_at,
        updated_at: row.updated_at,
        metadata: metadata // 메타정보 추가
      });
    }
    stmt.free();
    
    console.log(`[데이터베이스] 총 ${logs.length}개의 로그 조회 완료`);
    
    // 발생일자별 그룹화
    if (groupByDate) {
      const grouped = {};
      logs.forEach(log => {
        // timestamp에서 날짜만 추출 (YYYY-MM-DD)
        // ISO 8601 형식 (2024-12-20T09:15:30.123Z) 또는 공백 형식 (2024-12-20 10:00:20.123Z) 모두 처리
        let dateStr = log.timestamp || log.metadata?.occurred_at || log.created_at || '';
        let date = '';
        if (dateStr) {
          // ISO 8601 형식이면 T로 분리, 공백 형식이면 공백으로 분리
          if (dateStr.includes('T')) {
            date = dateStr.split('T')[0];
          } else if (dateStr.includes(' ')) {
            date = dateStr.split(' ')[0];
          } else {
            // 이미 날짜 형식인 경우
            date = dateStr.substring(0, 10);
          }
        }
        // 날짜 형식 검증 (YYYY-MM-DD)
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // 형식이 맞지 않으면 created_at 사용
          const createdStr = log.created_at || '';
          if (createdStr.includes('T')) {
            date = createdStr.split('T')[0];
          } else if (createdStr.includes(' ')) {
            date = createdStr.split(' ')[0];
          } else {
            date = createdStr.substring(0, 10);
          }
        }
        console.log(`[데이터베이스] 로그 그룹화 - ID: ${log.id}, timestamp: ${log.timestamp}, date: ${date}`);
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(log);
      });
      
      // 날짜별로 정렬 (최신순)
      const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
      console.log(`[데이터베이스] 그룹화된 날짜: ${sortedDates.join(', ')}`);
      const result = sortedDates.map(date => ({
        date: date,
        errors: grouped[date].sort((a, b) => {
          const timeA = a.timestamp || a.metadata?.occurred_at || a.created_at;
          const timeB = b.timestamp || b.metadata?.occurred_at || b.created_at;
          return timeB.localeCompare(timeA);
        }),
        count: grouped[date].length
      }));
      console.log(`[데이터베이스] 그룹화 결과: ${result.length}개 그룹, 총 ${logs.length}개 로그`);
      return result;
    }
    
    return logs;
  },

  // ID로 에러 로그 조회
  findById(id) {
    const stmt = db.prepare('SELECT * FROM error_logs WHERE id = ?');
    stmt.bind([id]);
    let log = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      log = {
        id: row.id,
        log_content: row.log_content,
        log_type: row.log_type,
        parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null,
        system_type: row.system_type,
        severity: row.severity,
        resource_type: row.resource_type,
        service_name: row.service_name,
        file_path: row.file_path,
        line_number: row.line_number,
        error_type: row.error_type,
        error_category: row.error_category,
        timestamp: row.timestamp,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      // 메타데이터도 함께 조회
      const metadataStmt = db.prepare('SELECT * FROM error_log_metadata WHERE error_log_id = ? ORDER BY created_at DESC LIMIT 1');
      metadataStmt.bind([id]);
      if (metadataStmt.step()) {
        const metadataRow = metadataStmt.getAsObject();
        log.metadata = {
          id: metadataRow.id,
          error_log_id: metadataRow.error_log_id,
          error_type: metadataRow.error_type,
          error_category: metadataRow.error_category,
          impact_level: metadataRow.impact_level,
          occurred_at: metadataRow.occurred_at,
          system_type: metadataRow.system_type,
          severity: metadataRow.severity,
          resource_type: metadataRow.resource_type,
          service_name: metadataRow.service_name,
          file_path: metadataRow.file_path,
          line_number: metadataRow.line_number,
          analysis_data: metadataRow.analysis_data ? JSON.parse(metadataRow.analysis_data) : null,
          created_at: metadataRow.created_at,
          updated_at: metadataRow.updated_at
        };
      }
      metadataStmt.free();
    }
    stmt.free();
    return log;
  },

  // 에러 로그 생성
  create(logData) {
    const now = new Date().toISOString();
    
    // parsed_data에서 메타데이터 추출
    const metadata = logData.parsed_data || logData.metadata || {};
    const systemType = metadata.system_type || logData.system_type || null;
    const severity = metadata.severity || logData.severity || null;
    const resourceType = metadata.resource?.type || logData.resource_type || null;
    const serviceName = metadata.service?.name || logData.service_name || null;
    const filePath = metadata.location?.file || logData.file_path || null;
    const lineNumber = metadata.location?.line || logData.line_number || null;
    const errorType = metadata.error_type || metadata.error?.type || logData.error_type || null;
    const errorCategory = metadata.error_category || metadata.error?.category || logData.error_category || null;
    const timestamp = metadata.timestamp || logData.timestamp || now;
    const impactLevel = metadata.impact_level || logData.impact_level || null;
    
    // 각 에러의 로그 내용 확보 (우선순위: log_content > parsed_data.log_content > parsed_data.original_log)
    // log_content는 각 에러의 개별 로그 내용이고, original_log는 전체 원본 로그입니다
    const errorLogContent = logData.log_content || metadata.log_content || '';
    const fullLogContent = metadata.original_log || logData.original_log || errorLogContent;
    
    // parsed_data에 전체 원본 로그 보존
    const finalParsedData = {
      ...metadata,
      original_log: fullLogContent,
      // solutions와 prevention이 있으면 포함
      solutions: metadata.solutions || logData.solutions || [],
      prevention: metadata.prevention || logData.prevention || [],
      root_cause: metadata.root_cause || logData.root_cause || null
    };
    
    // error_logs 테이블에 저장
    const stmt = db.prepare(
      'INSERT INTO error_logs (log_content, log_type, parsed_data, system_type, severity, resource_type, service_name, file_path, line_number, error_type, error_category, timestamp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run([
      errorLogContent || fullLogContent, // 각 에러의 로그 내용 저장 (여러 줄 포함)
      logData.log_type || metadata.log_type || null,
      JSON.stringify(finalParsedData), // 전체 메타데이터와 원본 로그 포함
      systemType,
      severity,
      resourceType,
      serviceName,
      filePath,
      lineNumber,
      errorType,
      errorCategory,
      timestamp,
      now,
      now
    ]);
    stmt.free();
    
    // 생성된 로그 ID 가져오기
    const logIdStmt = db.prepare('SELECT last_insert_rowid() as id');
    let logId = null;
    if (logIdStmt.step()) {
      const row = logIdStmt.getAsObject();
      logId = row.id;
    }
    logIdStmt.free();
    
    console.log(`[데이터베이스] 에러 로그 저장 완료 - ID: ${logId}, timestamp: ${timestamp}, created_at: ${now}`);
    
    // error_log_metadata 테이블에 메타데이터 별도 저장
    if (logId) {
      // solutions와 prevention을 parsed_data에서 우선 추출
      const solutions = metadata.solutions || logData.solutions || finalParsedData.solutions || [];
      const prevention = metadata.prevention || logData.prevention || finalParsedData.prevention || [];
      const rootCause = metadata.root_cause || logData.root_cause || finalParsedData.root_cause || null;
      
      const analysisData = {
        root_cause: rootCause,
        solutions: solutions,
        prevention: prevention,
        analysis: metadata.analysis || logData.analysis || null
      };
      
      const metadataStmt = db.prepare(
        'INSERT INTO error_log_metadata (error_log_id, error_type, error_category, impact_level, occurred_at, system_type, severity, resource_type, service_name, file_path, line_number, analysis_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      metadataStmt.run([
        logId,
        errorType,
        errorCategory,
        impactLevel,
        timestamp,
        systemType,
        severity,
        resourceType,
        serviceName,
        filePath,
        lineNumber,
        JSON.stringify(analysisData),
        now,
        now
      ]);
      metadataStmt.free();
    }
    
    saveDatabase();

    // 생성된 로그 조회
    const stmt2 = db.prepare('SELECT * FROM error_logs WHERE id = ?');
    stmt2.bind([logId]);
    let log = null;
    if (stmt2.step()) {
      const row = stmt2.getAsObject();
      log = {
        id: row.id,
        log_content: row.log_content,
        log_type: row.log_type,
        parsed_data: row.parsed_data ? JSON.parse(row.parsed_data) : null,
        system_type: row.system_type,
        severity: row.severity,
        resource_type: row.resource_type,
        service_name: row.service_name,
        file_path: row.file_path,
        line_number: row.line_number,
        error_type: row.error_type,
        error_category: row.error_category,
        timestamp: row.timestamp,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      // 메타데이터도 함께 조회
      const metadataStmt = db.prepare('SELECT * FROM error_log_metadata WHERE error_log_id = ? ORDER BY created_at DESC LIMIT 1');
      metadataStmt.bind([logId]);
      if (metadataStmt.step()) {
        const metadataRow = metadataStmt.getAsObject();
        log.metadata = {
          id: metadataRow.id,
          error_log_id: metadataRow.error_log_id,
          error_type: metadataRow.error_type,
          error_category: metadataRow.error_category,
          impact_level: metadataRow.impact_level,
          occurred_at: metadataRow.occurred_at,
          system_type: metadataRow.system_type,
          severity: metadataRow.severity,
          resource_type: metadataRow.resource_type,
          service_name: metadataRow.service_name,
          file_path: metadataRow.file_path,
          line_number: metadataRow.line_number,
          analysis_data: metadataRow.analysis_data ? JSON.parse(metadataRow.analysis_data) : null,
          created_at: metadataRow.created_at,
          updated_at: metadataRow.updated_at
        };
      }
      metadataStmt.free();
    }
    stmt2.free();
    
    return log;
  }
};

// 기본 내보내기
export default {
  init,
  errorLogsDB
};

