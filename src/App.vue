<template>
  <div id="app">
    <!-- 메인 콘텐츠 -->
    <div class="main-content">
      <div class="main-header">
        <h1>AI 에러 로그 분석 시스템</h1>
        <p class="subtitle">에러 로그 파일을 분석하여 원인 파악 및 해결 방안 제시</p>
      </div>

      <!-- AI 에러로그분석 섹션 -->
      <div class="error-log-analysis-section">
        <div class="section-header">
          <h2>🔧 AI 에러로그분석</h2>
          <p class="section-description">에러 로그 파일을 분석하여 원인 파악 및 해결 방안 제시</p>
        </div>
        <div class="feature-buttons">
          <div class="button-group-card">
            <button @click="toggleErrorLogAnalysis" class="btn btn-error-log-analysis" :class="{ active: showErrorLogAnalysis }">
              <div class="button-icon">🔧</div>
              <div class="button-content">
                <div class="button-title">AI 에러로그분석</div>
                <div class="button-subtitle">에러 로그 분석 및 조치 방법 제안</div>
              </div>
            </button>
          </div>
          <div class="button-group-card">
            <button @click="openErrorLogStatusModal" class="btn btn-error-log-status" :class="{ active: showErrorLogStatusModal }">
              <div class="button-icon">📋</div>
              <div class="button-content">
                <div class="button-title">AI 에러 로그 현황</div>
                <div class="button-subtitle">저장된 에러 로그 최신순 조회</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- AI 에러로그분석 결과 영역 -->
      <ErrorLogAnalysis v-model="showErrorLogAnalysis" />

      <!-- AI 에러 로그 현황 모달 -->
      <div v-if="showErrorLogStatusModal" class="modal-overlay" @click="closeErrorLogStatusModal" style="z-index: 2000;">
        <div class="modal-content error-log-status-modal" @click.stop style="max-width: 1200px; max-height: 90vh; z-index: 2001; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5;">
          <div class="modal-header">
            <h2 style="font-size: 20px; font-weight: 600; margin: 0;">📋 AI 에러 로그 현황</h2>
            <button @click="closeErrorLogStatusModal" class="btn-close">✕</button>
          </div>
          <div class="modal-body" style="overflow-y: auto; max-height: calc(90vh - 120px);">
            <!-- 로딩 상태 -->
            <div v-if="errorLogStatusLoading" class="loading">
              <p>에러 로그를 불러오는 중...</p>
            </div>

            <!-- 에러 메시지 -->
            <div v-else-if="errorLogStatusError" class="error-message">
              {{ errorLogStatusError }}
            </div>

            <!-- 에러 로그 목록 -->
            <div v-else-if="errorLogStatusList && errorLogStatusList.length > 0">
              <div style="margin-bottom: 12px;">
                <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                  에러 로그 목록 ({{ errorLogStatusList.reduce((sum, group) => sum + (group.count || group.errors?.length || 1), 0) }}건) - 발생일자별 그룹화
                </h4>
              </div>

              <!-- 발생일자별로 그룹화하여 표시 -->
              <div v-for="(group, groupIndex) in errorLogStatusList" :key="group.date || groupIndex" style="margin-bottom: 24px;">
                <!-- 날짜 헤더 -->
                <div style="background: #f5f5f5; padding: 12px 16px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                  <h5 style="font-size: 15px; font-weight: 600; margin: 0; color: #333; font-family: inherit;">
                    📅 {{ group.date || '날짜 미지정' }}
                  </h5>
                  <span style="font-size: 13px; color: #666; font-family: inherit;">
                    {{ group.count || group.errors?.length || 0 }}건
                  </span>
                </div>

                <!-- 해당 날짜의 에러 목록 -->
                <div style="overflow-x: auto; background: white; border-radius: 0 0 8px 8px; position: relative;">
                  <!-- 버튼을 테이블 오른쪽 상단에 배치 -->
                  <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 8px; z-index: 10;">
                    <button @click="loadErrorLogStatus" class="btn" style="padding: 3px 8px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: inherit; white-space: nowrap; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      🔄 새로고침
                    </button>
                    <button @click="showDeleteAllConfirm = true" class="btn" style="padding: 3px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: inherit; white-space: nowrap; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      🗑️ 전체 삭제
                    </button>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="background: #fafafa;">
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">번호</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">저장시간</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">발생시간</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">시스템</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">심각도</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">에러 타입</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">에러 내용</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">발생 위치</th>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; font-weight: 600; font-family: inherit;">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(log, index) in (group.errors || [group])" :key="log.id || index" style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">{{ index + 1 }}</td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          {{ formatDateTime(log.created_at) }}
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          {{ formatDateTime(log.timestamp || log.metadata?.occurred_at) }}
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          <span style="padding: 4px 8px; border-radius: 4px; background: #e3f2fd; color: #1976d2; font-size: 12px; font-weight: 500; font-family: inherit;">
                            {{ log.system_type || log.log_type || 'N/A' }}
                          </span>
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          <span :style="{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            fontFamily: 'inherit',
                            color: log.severity === 'CRITICAL' ? '#d32f2f' : log.severity === 'ERROR' ? '#f57c00' : '#fbc02d',
                            background: log.severity === 'CRITICAL' ? '#ffebee' : log.severity === 'ERROR' ? '#fff3e0' : '#fffde7'
                          }">
                            {{ log.severity || 'N/A' }}
                          </span>
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          {{ log.error_type || (typeof log.parsed_data === 'string' ? JSON.parse(log.parsed_data || '{}').error_type : log.parsed_data?.error_type) || log.metadata?.error_type || 'N/A' }}
                        </td>
                        <td style="padding: 10px 12px; font-size: 12px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; max-width: 400px; word-break: break-word; line-height: 1.4;">
                          <div style="max-height: 60px; overflow: hidden; text-overflow: ellipsis; color: #333;">
                            {{ getErrorPreview(log) }}
                          </div>
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          <span v-if="log.file_path" style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 12px;">
                            {{ log.file_path }}{{ log.line_number ? ':' + log.line_number : '' }}
                          </span>
                          <span v-else style="font-family: inherit;">N/A</span>
                        </td>
                        <td style="padding: 10px 12px; font-size: 13px; font-family: inherit;">
                          <button @click="showErrorLogStatusDetail(log)" class="btn" style="padding: 6px 12px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; font-family: inherit;">
                            상세보기
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- 빈 목록 -->
            <div v-else style="padding: 40px; text-align: center; color: #666; font-size: 14px; font-family: inherit;">
              <p style="margin: 0; font-size: 14px;">저장된 에러 로그가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 전체 삭제 확인 다이얼로그 -->
      <div v-if="showDeleteAllConfirm" class="modal-overlay" @click="showDeleteAllConfirm = false" style="z-index: 2010;">
        <div class="modal-content" @click.stop style="max-width: 500px; z-index: 2011; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #d32f2f;">⚠️ 전체 삭제 확인</h3>
          </div>
          <div class="modal-body" style="padding: 20px;">
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #333;">
              저장된 모든 에러 로그를 삭제하시겠습니까?<br>
              <strong style="color: #d32f2f;">이 작업은 되돌릴 수 없습니다.</strong>
            </p>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button @click="showDeleteAllConfirm = false" class="btn" style="padding: 8px 16px; background: #757575; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit;">
                취소
              </button>
              <button @click="deleteAllErrorLogs" class="btn" :disabled="isDeletingAll" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-family: inherit; opacity: isDeletingAll ? 0.6 : 1;">
                <span v-if="!isDeletingAll">삭제</span>
                <span v-else>삭제 중...</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 에러 로그 현황 상세 보기 모달 -->
      <div v-if="showErrorLogStatusDetailModal" class="modal-overlay" @click="closeErrorLogStatusDetail" style="z-index: 2002;">
        <div class="modal-content error-log-detail-modal" @click.stop style="max-width: 1200px; max-height: 95vh; z-index: 2003; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5;">
          <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 4px 0;">🔍 에러 로그 상세 정보</h2>
              <div style="font-size: 13px; opacity: 0.9;">
                {{ selectedErrorLogStatus?.error_type || '에러 정보' }}
              </div>
            </div>
            <button @click="closeErrorLogStatusDetail" class="btn-close" style="background: rgba(255,255,255,0.2); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
          </div>
          <div class="modal-body" style="overflow-y: auto; max-height: calc(95vh - 140px); padding: 24px;">
            <div v-if="selectedErrorLogStatus">
              <!-- 에러 내용 (가장 먼저 표시) -->
              <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <span style="font-size: 24px;">⚠️</span>
                  <h3 style="margin: 0; font-size: 18px; font-weight: 700;">에러 내용</h3>
                </div>
                <div style="background: rgba(255,255,255,0.15); padding: 16px; border-radius: 8px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; max-height: 200px; overflow-y: auto;">
                  {{ selectedErrorLogStatus.log_content || selectedErrorLogStatus.parsed_data?.log_content || selectedErrorLogStatus.parsed_data?.original_log || '로그 내용이 없습니다.' }}
                </div>
              </div>

              <!-- 핵심 정보 카드 -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <!-- 발생일시 -->
                <div style="padding: 16px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #667eea;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">📅 발생일시</div>
                  <div style="font-size: 15px; font-weight: 600; color: #333;">{{ formatDateTime(selectedErrorLogStatus.timestamp || selectedErrorLogStatus.metadata?.occurred_at || selectedErrorLogStatus.created_at) }}</div>
                </div>
                
                <!-- 심각도 -->
                <div style="padding: 16px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #ff6b6b;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">🚨 심각도</div>
                  <div style="margin-top: 4px;">
                    <span :style="{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: 'inherit',
                      display: 'inline-block',
                      color: selectedErrorLogStatus.severity === 'CRITICAL' ? '#d32f2f' : selectedErrorLogStatus.severity === 'ERROR' ? '#f57c00' : '#fbc02d',
                      background: selectedErrorLogStatus.severity === 'CRITICAL' ? '#ffebee' : selectedErrorLogStatus.severity === 'ERROR' ? '#fff3e0' : '#fffde7'
                    }">
                      {{ selectedErrorLogStatus.severity || 'N/A' }}
                    </span>
                  </div>
                </div>

                <!-- 영향도 -->
                <div v-if="selectedErrorLogStatus.metadata?.impact_level" style="padding: 16px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #ffa726;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">📊 영향도</div>
                  <div style="margin-top: 4px;">
                    <span :style="{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: 'inherit',
                      display: 'inline-block',
                      color: selectedErrorLogStatus.metadata.impact_level === 'HIGH' ? '#d32f2f' : selectedErrorLogStatus.metadata.impact_level === 'MEDIUM' ? '#f57c00' : '#388e3c',
                      background: selectedErrorLogStatus.metadata.impact_level === 'HIGH' ? '#ffebee' : selectedErrorLogStatus.metadata.impact_level === 'MEDIUM' ? '#fff3e0' : '#e8f5e9'
                    }">
                      {{ selectedErrorLogStatus.metadata.impact_level === 'HIGH' ? '높음' : selectedErrorLogStatus.metadata.impact_level === 'MEDIUM' ? '중간' : selectedErrorLogStatus.metadata.impact_level === 'LOW' ? '낮음' : selectedErrorLogStatus.metadata.impact_level }}
                    </span>
                  </div>
                </div>

                <!-- 에러 타입 -->
                <div style="padding: 16px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #42a5f5;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">🏷️ 에러 타입</div>
                  <div style="font-size: 15px; font-weight: 600; color: #333;">{{ selectedErrorLogStatus.error_type || 'N/A' }}</div>
                </div>

                <!-- 카테고리 -->
                <div v-if="selectedErrorLogStatus.error_category || selectedErrorLogStatus.metadata?.error_category" style="padding: 16px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #66bb6a;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">📂 카테고리</div>
                  <div style="font-size: 15px; font-weight: 600; color: #333;">{{ selectedErrorLogStatus.error_category || selectedErrorLogStatus.metadata?.error_category || 'N/A' }}</div>
                </div>

                <!-- 발생 위치 -->
                <div v-if="selectedErrorLogStatus.file_path || selectedErrorLogStatus.metadata?.file_path" style="padding: 16px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #ab47bc;">
                  <div style="font-size: 12px; color: #666; margin-bottom: 6px; font-weight: 600;">📍 발생 위치</div>
                  <div style="font-size: 13px; font-weight: 600; color: #333; font-family: 'Consolas', 'Monaco', 'Courier New', monospace;">
                    {{ (selectedErrorLogStatus.file_path || selectedErrorLogStatus.metadata?.file_path) }}{{ (selectedErrorLogStatus.line_number || selectedErrorLogStatus.metadata?.line_number) ? ':' + (selectedErrorLogStatus.line_number || selectedErrorLogStatus.metadata?.line_number) : '' }}
                  </div>
                </div>
              </div>

              <!-- 해결방안 -->
              <div v-if="(selectedErrorLogStatus.parsed_data?.solutions && selectedErrorLogStatus.parsed_data.solutions.length > 0) || (selectedErrorLogStatus.metadata?.analysis_data?.solutions && selectedErrorLogStatus.metadata.analysis_data.solutions.length > 0)" style="margin-bottom: 24px;">
                <div style="padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <span style="font-size: 24px;">💡</span>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white;">해결방안</h3>
                  </div>
                  <div v-for="(solution, solIdx) in (selectedErrorLogStatus.parsed_data?.solutions || selectedErrorLogStatus.metadata?.analysis_data?.solutions || [])" :key="solIdx" style="margin-bottom: 16px; padding: 16px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div v-if="typeof solution === 'string'" style="font-size: 15px; line-height: 1.7; color: #333; font-family: inherit;">
                      <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; margin-right: 12px; font-size: 13px;">{{ solIdx + 1 }}</span>
                      {{ solution }}
                    </div>
                    <div v-else>
                      <div style="font-size: 17px; font-weight: 700; color: #1976d2; margin-bottom: 10px; font-family: inherit; display: flex; align-items: center;">
                        <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; margin-right: 12px; font-size: 13px;">{{ solIdx + 1 }}</span>
                        {{ solution.title || `해결방안 ${solIdx + 1}` }}
                      </div>
                      <div v-if="solution.description" style="font-size: 14px; color: #555; margin-bottom: 14px; line-height: 1.7; font-family: inherit; margin-left: 40px;">
                        {{ solution.description }}
                      </div>
                      <div v-if="solution.steps && solution.steps.length > 0" style="margin-top: 14px; margin-left: 40px;">
                        <div style="font-size: 13px; font-weight: 600; color: #666; margin-bottom: 10px;">📋 단계별 가이드:</div>
                        <ol style="margin: 0; padding-left: 24px; font-size: 14px; line-height: 2; color: #333; font-family: inherit;">
                          <li v-for="(step, stepIdx) in solution.steps" :key="stepIdx" style="margin-bottom: 8px;">{{ step }}</li>
                        </ol>
                      </div>
                      <div v-if="solution.code_example" style="margin-top: 14px; margin-left: 40px;">
                        <div style="font-size: 13px; font-weight: 600; color: #666; margin-bottom: 10px;">💻 코드 예시:</div>
                        <pre style="padding: 14px; background: #2d2d2d; color: #f8f8f2; border-radius: 8px; overflow-x: auto; font-size: 13px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; line-height: 1.5; border: 1px solid #444;">{{ solution.code_example }}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 재발 방지책 -->
              <div v-if="(selectedErrorLogStatus.parsed_data?.prevention && selectedErrorLogStatus.parsed_data.prevention.length > 0) || (selectedErrorLogStatus.metadata?.analysis_data?.prevention && selectedErrorLogStatus.metadata.analysis_data.prevention.length > 0)" style="margin-bottom: 24px;">
                <div style="padding: 20px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: 12px; box-shadow: 0 4px 12px rgba(250, 112, 154, 0.3);">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <span style="font-size: 24px;">🛡️</span>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white;">재발 방지책</h3>
                  </div>
                  <div v-for="(prevention, prevIdx) in (selectedErrorLogStatus.parsed_data?.prevention || selectedErrorLogStatus.metadata?.analysis_data?.prevention || [])" :key="prevIdx" style="margin-bottom: 16px; padding: 16px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div v-if="typeof prevention === 'string'" style="font-size: 15px; line-height: 1.7; color: #333; font-family: inherit;">
                      <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; margin-right: 12px; font-size: 13px;">{{ prevIdx + 1 }}</span>
                      {{ prevention }}
                    </div>
                    <div v-else>
                      <div style="font-size: 17px; font-weight: 700; color: #c62828; margin-bottom: 10px; font-family: inherit; display: flex; align-items: center;">
                        <span style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 700; margin-right: 12px; font-size: 13px;">{{ prevIdx + 1 }}</span>
                        {{ prevention.title || `재발 방지책 ${prevIdx + 1}` }}
                      </div>
                      <div v-if="prevention.description" style="font-size: 14px; color: #555; margin-bottom: 14px; line-height: 1.7; font-family: inherit; margin-left: 40px;">
                        {{ prevention.description }}
                      </div>
                      <div v-if="prevention.implementation" style="margin-top: 14px; margin-left: 40px;">
                        <div style="font-size: 13px; font-weight: 600; color: #666; margin-bottom: 10px;">💻 구현 예시:</div>
                        <pre style="padding: 14px; background: #2d2d2d; color: #f8f8f2; border-radius: 8px; overflow-x: auto; font-size: 13px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; line-height: 1.5; border: 1px solid #444;">{{ prevention.implementation }}</pre>
                      </div>
                      <div v-if="prevention.benefits && prevention.benefits.length > 0" style="margin-top: 14px; margin-left: 40px;">
                        <div style="font-size: 13px; font-weight: 600; color: #666; margin-bottom: 10px;">✨ 기대 효과:</div>
                        <ul style="margin: 0; padding-left: 24px; font-size: 14px; line-height: 2; color: #333; font-family: inherit;">
                          <li v-for="(benefit, benefitIdx) in prevention.benefits" :key="benefitIdx" style="margin-bottom: 6px;">✓ {{ benefit }}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 원본 로그 (접을 수 있게) -->
              <div style="margin-bottom: 24px;">
                <div @click="showFullLog = !showFullLog" style="cursor: pointer; padding: 16px; background: #f5f5f5; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;" :style="{ background: showFullLog ? '#e8eaf6' : '#f5f5f5' }">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <span>📄</span>
                    <span>원본 로그</span>
                  </h3>
                  <span style="font-size: 18px; transition: transform 0.2s;" :style="{ transform: showFullLog ? 'rotate(180deg)' : 'rotate(0deg)' }">▼</span>
                </div>
                <div v-show="showFullLog" style="margin-top: 12px; padding: 16px; background: #2d2d2d; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                  <pre style="margin: 0; padding: 0; font-size: 12px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; line-height: 1.6; color: #f8f8f2; white-space: pre-wrap; word-wrap: break-word;">{{ selectedErrorLogStatus.log_content || selectedErrorLogStatus.parsed_data?.log_content || selectedErrorLogStatus.parsed_data?.original_log || '로그 내용이 없습니다.' }}</pre>
                </div>
              </div>
              
              <!-- 전체 원본 로그 (original_log가 있는 경우, 접을 수 있게) -->
              <div v-if="selectedErrorLogStatus.parsed_data?.original_log && selectedErrorLogStatus.parsed_data.original_log !== selectedErrorLogStatus.log_content" style="margin-bottom: 24px;">
                <div @click="showFullOriginalLog = !showFullOriginalLog" style="cursor: pointer; padding: 16px; background: #f5f5f5; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;" :style="{ background: showFullOriginalLog ? '#e8eaf6' : '#f5f5f5' }">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <span>📋</span>
                    <span>전체 원본 로그 파일</span>
                  </h3>
                  <span style="font-size: 18px; transition: transform 0.2s;" :style="{ transform: showFullOriginalLog ? 'rotate(180deg)' : 'rotate(0deg)' }">▼</span>
                </div>
                <div v-show="showFullOriginalLog" style="margin-top: 12px; padding: 16px; background: #2d2d2d; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                  <pre style="margin: 0; padding: 0; font-size: 12px; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; line-height: 1.6; color: #f8f8f2; white-space: pre-wrap; word-wrap: break-word;">{{ selectedErrorLogStatus.parsed_data.original_log }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getApiUrl } from './config/api.js'
import { formatDateTime } from './utils/helpers.js'
import ErrorLogAnalysis from './components/ErrorLogAnalysis.vue'

// 에러 로그 분석 관련
const showErrorLogAnalysis = ref(false)

// AI 에러 로그 현황 관련
const showErrorLogStatusModal = ref(false)
const errorLogStatusList = ref([])
const errorLogStatusLoading = ref(false)
const errorLogStatusError = ref('')
const selectedErrorLogStatus = ref(null)
const showErrorLogStatusDetailModal = ref(false)
const showFullLog = ref(false)
const showFullOriginalLog = ref(false)
const showDeleteAllConfirm = ref(false)
const isDeletingAll = ref(false)

const toggleErrorLogAnalysis = () => {
  showErrorLogAnalysis.value = !showErrorLogAnalysis.value
}

// AI 에러 로그 현황 모달 열기
const openErrorLogStatusModal = async () => {
  console.log('[에러 로그 현황] 모달 열기')
  showErrorLogStatusModal.value = true
  console.log('[에러 로그 현황] showErrorLogStatusModal:', showErrorLogStatusModal.value)
  await loadErrorLogStatus()
}

// AI 에러 로그 현황 모달 닫기
const closeErrorLogStatusModal = () => {
  showErrorLogStatusModal.value = false
}

// 에러 로그 현황 최신순 조회
const loadErrorLogStatus = async () => {
  errorLogStatusLoading.value = true
  errorLogStatusError.value = ''
  
  try {
    // 발생일자별 그룹화 옵션 활성화
    const response = await fetch(getApiUrl('/api/error-log/history?limit=100&groupBy=date'))
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('[App.vue] 조회 응답:', data)
    console.log('[App.vue] 조회된 그룹 개수:', data.result?.length)
    if (data.result && data.result.length > 0) {
      console.log('[App.vue] 첫 번째 그룹:', data.result[0])
      data.result.forEach((group, i) => {
        console.log(`[App.vue] 그룹 ${i+1}: 날짜=${group.date}, 개수=${group.count || group.errors?.length}`)
      })
    }
    
    if (data.success) {
      // 그룹화된 데이터인지 확인
      if (Array.isArray(data.result) && data.result.length > 0 && data.result[0].date) {
        // 발생일자별로 그룹화된 데이터
        errorLogStatusList.value = data.result
        console.log('[App.vue] 그룹화된 데이터로 설정 완료, 총 그룹 수:', errorLogStatusList.value.length)
      } else {
        // 기존 형식: 발생일자별로 그룹화
        const grouped = {}
        ;(data.result || []).forEach(log => {
          const date = log.timestamp ? log.timestamp.split('T')[0] : 
                       (log.metadata?.occurred_at ? log.metadata.occurred_at.split('T')[0] : 
                        log.created_at.split('T')[0])
          if (!grouped[date]) {
            grouped[date] = []
          }
          grouped[date].push(log)
        })
        
        // 날짜별로 정렬 (최신순)
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
        errorLogStatusList.value = sortedDates.map(date => ({
          date: date,
          errors: grouped[date].sort((a, b) => {
            const timeA = a.timestamp || a.metadata?.occurred_at || a.created_at
            const timeB = b.timestamp || b.metadata?.occurred_at || b.created_at
            return timeB.localeCompare(timeA)
          }),
          count: grouped[date].length
        }))
      }
      errorLogStatusError.value = ''
    } else {
      errorLogStatusError.value = data.error || '에러 로그를 불러올 수 없습니다.'
    }
  } catch (error) {
    console.error('[에러 로그 현황 로드] 오류:', error)
    errorLogStatusError.value = `에러 로그를 불러오는 중 오류가 발생했습니다: ${error.message}`
  } finally {
    errorLogStatusLoading.value = false
  }
}

// 에러 로그 현황 상세 보기
const showErrorLogStatusDetail = (log) => {
  selectedErrorLogStatus.value = log
  showErrorLogStatusDetailModal.value = true
}

// 에러 로그 현황 상세 모달 닫기
const closeErrorLogStatusDetail = () => {
  showErrorLogStatusDetailModal.value = false
  selectedErrorLogStatus.value = null
  showFullLog.value = false
  showFullOriginalLog.value = false
}

// 전체 에러 로그 삭제
const deleteAllErrorLogs = async () => {
  if (isDeletingAll.value) {
    return
  }

  isDeletingAll.value = true

  try {
    const response = await fetch(getApiUrl('/api/error-log/delete-all'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      // 목록 새로고침
      await loadErrorLogStatus()
      showDeleteAllConfirm.value = false
      alert('✅ 모든 에러 로그가 삭제되었습니다.')
    } else {
      throw new Error(data.error || '삭제 실패')
    }
  } catch (error) {
    console.error('전체 삭제 오류:', error)
    alert(`❌ 삭제 중 오류가 발생했습니다: ${error.message}`)
  } finally {
    isDeletingAll.value = false
  }
}

// 에러 내용 미리보기 추출 함수
const getErrorPreview = (log) => {
  // 우선순위: log_content > parsed_data.log_content > parsed_data.original_log > parsed_data.message > metadata.analysis_data
  const errorContent = log.log_content || 
                       log.parsed_data?.log_content || 
                       log.parsed_data?.original_log ||
                       log.parsed_data?.message ||
                       log.metadata?.analysis_data?.message ||
                       log.error_type ||
                       '내용 없음'
  
  // 여러 줄인 경우 첫 줄만 추출하고, 너무 길면 잘라내기
  const firstLine = errorContent.split('\n')[0].trim()
  if (firstLine.length > 150) {
    return firstLine.substring(0, 150) + '...'
  }
  return firstLine || '내용 없음'
}

// 에러 로그 저장 이벤트 핸들러
const handleErrorLogSaved = () => {
  console.log('[App.vue] 에러 로그 저장 이벤트 감지, 목록 새로고침')
  console.log('[App.vue] 모달 열림 상태:', showErrorLogStatusModal.value)
  // 에러 로그 현황 모달이 열려있으면 목록 새로고침
  if (showErrorLogStatusModal.value) {
    console.log('[App.vue] 목록 새로고침 시작')
    loadErrorLogStatus()
  } else {
    console.log('[App.vue] 모달이 닫혀있어서 목록 새로고침하지 않음')
  }
}

onMounted(() => {
  // 에러 로그 저장 이벤트 리스너 추가
  window.addEventListener('errorLogSaved', handleErrorLogSaved)
})

onBeforeUnmount(() => {
  // 에러 로그 저장 이벤트 리스너 제거
  window.removeEventListener('errorLogSaved', handleErrorLogSaved)
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  padding: 2rem;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
}

.main-header {
  text-align: center;
  margin-bottom: 3rem;
}

.main-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

.error-log-analysis-section {
  padding: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7fa 50%, #e8ecf1 100%);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
  height: fit-content;
  margin-bottom: 2rem;
}

.error-log-analysis-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #f093fb 50%, #f5576c 100%);
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.section-description {
  font-size: 1rem;
  color: #666;
  margin: 0;
}

.feature-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.button-group-card {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.btn {
  width: 100%;
  padding: 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
}

.btn-error-log-analysis {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.btn-error-log-analysis:hover {
  background: linear-gradient(135deg, #ee5a6f 0%, #ff6b6b 100%);
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
}

.btn-error-log-analysis.active {
  box-shadow: 0 12px 40px rgba(255, 107, 107, 0.6);
}

.btn-error-log-status {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.btn-error-log-status:hover {
  background: linear-gradient(135deg, #ee5a6f 0%, #ff6b6b 100%);
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
}

.btn-error-log-status.active {
  box-shadow: 0 12px 40px rgba(255, 107, 107, 0.6);
}

.button-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.button-content {
  flex: 1;
}

.button-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.button-subtitle {
  font-size: 0.9rem;
  opacity: 0.9;
}
</style>

