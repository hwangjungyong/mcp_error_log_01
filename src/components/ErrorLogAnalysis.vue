<template>
  <div v-if="modelValue" class="error-log-analysis-container">
    <h2>🔧 AI 에러로그 분석</h2>
    <div class="analysis-notice">
      <p>ℹ️ 에러 로그 파일을 분석하여 원인 파악 및 해결 방안을 제시합니다.</p>
      <p>💡 MCP Python 서버를 사용하여 에러 로그를 분석합니다.</p>
    </div>
    
    <div class="input-group">
      <label for="errorLogFile">에러 로그 파일 경로 (선택사항):</label>
      <input
        id="errorLogFile"
        v-model="errorLogFile"
        type="text"
        placeholder="예: logs/error.log"
        class="input-field"
      />
    </div>
    
    <div class="input-group">
      <label for="errorLogContent" style="font-size: 16px; font-weight: 600; margin-bottom: 0.75rem; display: block; color: #333;">
        에러 로그 내용:
      </label>
      <textarea
        id="errorLogContent"
        v-model="errorLogContent"
        placeholder="에러 로그 내용을 붙여넣으세요..."
        class="error-log-textarea"
        rows="15"
      ></textarea>
    </div>
    
    <div class="analysis-actions">
      <button @click="analyzeErrorLog" class="btn-analyze-error-log" :disabled="isAnalyzingErrorLog">
        <span class="btn-icon" v-if="!isAnalyzingErrorLog">🔍</span>
        <span class="loading-spinner" v-if="isAnalyzingErrorLog"></span>
        <span class="btn-text">
          <span v-if="!isAnalyzingErrorLog">AI 에러 로그 분석하기</span>
          <span v-else>분석 중...</span>
        </span>
      </button>
      <button @click="clearErrorLogAnalysis" class="btn-clear-error-log">
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">초기화</span>
      </button>
    </div>
    
    <div v-if="errorLogAnalysisError" class="error">
      <p>{{ errorLogAnalysisError }}</p>
    </div>
    
    <div v-if="errorLogAnalysisResult" class="error-log-analysis-results">
      <h3>분석 결과</h3>
      
      <!-- 로그 타입 식별 -->
      <div class="analysis-section log-type-section">
        <h4>🏷️ 로그 타입 식별</h4>
        <div class="log-type-info">
          <div v-if="errorLogAnalysisResult.log_type || errorLogAnalysisResult.metadata?.log_type" class="log-type-badge">
            <strong>감지된 로그 타입:</strong>
            <span class="log-type-value">
              {{ getLogTypeLabel(errorLogAnalysisResult.log_type || errorLogAnalysisResult.metadata?.log_type) }}
            </span>
          </div>
          <div v-if="errorLogAnalysisResult.system_type || errorLogAnalysisResult.metadata?.system_type" class="log-type-badge">
            <strong>시스템/프레임워크:</strong>
            <span class="log-type-value">
              {{ errorLogAnalysisResult.system_type || errorLogAnalysisResult.metadata?.system_type }}
            </span>
          </div>
          <div v-if="errorLogAnalysisResult.log_format || errorLogAnalysisResult.metadata?.log_format" class="log-type-badge">
            <strong>로그 형식:</strong>
            <span class="log-type-value">
              {{ errorLogAnalysisResult.log_format || errorLogAnalysisResult.metadata?.log_format }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 요약 정보 -->
      <div v-if="errorLogAnalysisResult.summary" class="analysis-section summary-section">
        <h4>📋 요약</h4>
        <div class="summary-content">
          <p style="white-space: pre-line;">{{ errorLogAnalysisResult.summary }}</p>
          
          <!-- 에러 통계 (여러 에러가 있을 때) -->
          <div v-if="errorLogAnalysisResult.metadata?.error_statistics && errorLogAnalysisResult.metadata.total_errors > 1" class="error-statistics" style="margin-top: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
            <h5 style="margin-top: 0; font-size: 14px; font-weight: 600; color: #2196f3;">📊 에러 통계 분석</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 12px;">
              <div v-if="errorLogAnalysisResult.metadata.most_frequent_type">
                <strong style="font-size: 12px; color: #666;">가장 빈번한 에러 타입</strong>
                <div style="font-size: 14px; font-weight: 600; color: #d32f2f;">
                  {{ errorLogAnalysisResult.metadata.most_frequent_type.type }} 
                  <span style="color: #666; font-weight: normal;">({{ errorLogAnalysisResult.metadata.most_frequent_type.count }}건, {{ errorLogAnalysisResult.metadata.most_frequent_type.percentage }}%)</span>
                </div>
              </div>
              <div v-if="errorLogAnalysisResult.metadata.most_frequent_category">
                <strong style="font-size: 12px; color: #666;">가장 빈번한 카테고리</strong>
                <div style="font-size: 14px; font-weight: 600; color: #f57c00;">
                  {{ errorLogAnalysisResult.metadata.most_frequent_category.category }}
                  <span style="color: #666; font-weight: normal;">({{ errorLogAnalysisResult.metadata.most_frequent_category.count }}건)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 에러 유형 -->
      <div v-if="errorLogAnalysisResult.error_type" class="analysis-section">
        <h4>🔍 에러 유형</h4>
        <div class="error-type-info">
          <p><strong>유형:</strong> {{ errorLogAnalysisResult.error_type }}</p>
          <p v-if="errorLogAnalysisResult.error_category"><strong>카테고리:</strong> {{ errorLogAnalysisResult.error_category }}</p>
          <p v-if="errorLogAnalysisResult.severity"><strong>심각도:</strong> 
            <span :class="getSeverityClass(errorLogAnalysisResult.severity)">
              {{ errorLogAnalysisResult.severity }}
            </span>
          </p>
          <p v-if="errorLogAnalysisResult.impact_level || errorLogAnalysisResult.metadata?.impact_level">
            <strong>영향도:</strong> 
            <span :class="getImpactClass(errorLogAnalysisResult.impact_level || errorLogAnalysisResult.metadata?.impact_level)">
              {{ getImpactLabel(errorLogAnalysisResult.impact_level || errorLogAnalysisResult.metadata?.impact_level) }}
            </span>
          </p>
        </div>
      </div>
      
      <!-- 원인 분석 -->
      <div v-if="errorLogAnalysisResult.root_cause" class="analysis-section">
        <h4>🔎 원인 분석</h4>
        <div class="root-cause-content">
          <p style="white-space: pre-line; line-height: 1.8;">{{ errorLogAnalysisResult.root_cause }}</p>
        </div>
      </div>
      
      <!-- 해결 방안 -->
      <div v-if="errorLogAnalysisResult.solutions && errorLogAnalysisResult.solutions.length > 0" class="analysis-section">
        <h4>💡 해결 방안</h4>
        <div class="solutions-list">
          <div v-for="(solution, index) in errorLogAnalysisResult.solutions" :key="index" class="solution-item-enhanced">
            <div class="solution-number">{{ index + 1 }}</div>
            <div class="solution-content">
              <div v-if="typeof solution === 'string'" class="solution-description">{{ solution }}</div>
              <div v-else>
                <div class="solution-title">{{ solution.title || `해결 방안 ${index + 1}` }}</div>
                <div v-if="solution.description" class="solution-description">{{ solution.description }}</div>
                <div v-if="solution.steps && solution.steps.length > 0" class="solution-steps">
                  <strong>단계별 가이드:</strong>
                  <ol>
                    <li v-for="(step, stepIdx) in solution.steps" :key="stepIdx">{{ step }}</li>
                  </ol>
                </div>
                <div v-if="solution.code_example" class="solution-code">
                  <strong>코드 예시:</strong>
                  <pre><code>{{ solution.code_example }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 재발 방지책 (메타데이터에 있는 경우) -->
      <div v-if="errorLogAnalysisResult.metadata?.analysis_details?.prevention_strategies && errorLogAnalysisResult.metadata.analysis_details.prevention_strategies.length > 0" class="analysis-section">
        <h4>🛡️ 재발 방지 전략</h4>
        <ul class="solutions-list">
          <li v-for="(prevention, index) in errorLogAnalysisResult.metadata.analysis_details.prevention_strategies" :key="index" class="solution-item">
            <strong>{{ index + 1 }}.</strong> 
            <span v-if="typeof prevention === 'string'">{{ prevention }}</span>
            <span v-else>
              <strong>{{ prevention.title || '재발 방지책' }}:</strong> {{ prevention.description || '' }}
            </span>
          </li>
        </ul>
      </div>
      
      <!-- 에러 목록 테이블 (에러가 있을 때) -->
      <div v-if="errorLogAnalysisResult && (errorLogAnalysisResult.metadata?.all_errors?.length > 0 || errorLogAnalysisResult.error_type)" class="analysis-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <h4 style="margin: 0;">📋 분석된 에러 목록 ({{ errorLogAnalysisResult.metadata?.all_errors?.length || 0 }}건)</h4>
          <div style="display: flex; gap: 8px;">
            <button @click="saveAllErrors" class="btn-save-all-errors" :disabled="isSavingAllErrors || !errorLogAnalysisResult.metadata?.all_errors || errorLogAnalysisResult.metadata.all_errors.length === 0">
              <span class="btn-icon" v-if="!isSavingAllErrors">💾</span>
              <span class="loading-spinner" v-if="isSavingAllErrors"></span>
              <span class="btn-text">
                <span v-if="!isSavingAllErrors">일괄 저장</span>
                <span v-else>저장 중 ({{ savedCount }}/{{ errorLogAnalysisResult.metadata?.all_errors?.length || 0 }})</span>
              </span>
            </button>
            <button @click="loadSavedErrors" class="btn-load-saved" :disabled="isLoadingSavedErrors">
              <span class="btn-icon" v-if="!isLoadingSavedErrors">🔄</span>
              <span class="loading-spinner" v-if="isLoadingSavedErrors"></span>
              <span class="btn-text">저장된 목록 조회</span>
            </button>
          </div>
        </div>
        <div v-if="saveAllErrorsMessage" class="save-message" :class="{ 'save-success': saveAllErrorsMessage.includes('✅'), 'save-error': saveAllErrorsMessage.includes('❌') }">
          {{ saveAllErrorsMessage }}
        </div>
        <div style="overflow-x: auto;">
          <table class="error-analysis-table" v-if="errorLogAnalysisResult.metadata?.all_errors && errorLogAnalysisResult.metadata.all_errors.length > 0">
            <thead>
              <tr>
                <th>번호</th>
                <th>발생일시</th>
                <th>에러 타입</th>
                <th>심각도</th>
                <th>영향도</th>
                <th>카테고리</th>
                <th>발생 위치</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(error, index) in errorLogAnalysisResult.metadata.all_errors" :key="index">
                <td>{{ error.index || index + 1 }}</td>
                <td>{{ formatDateTime(error.timestamp) }}</td>
                <td>{{ error.error_type || error.type || 'N/A' }}</td>
                <td>
                  <span :class="getSeverityClass(error.severity)">
                    {{ error.severity || 'ERROR' }}
                  </span>
                </td>
                <td>
                  <span :class="getImpactClass(error.impact_level)">
                    {{ getImpactLabel(error.impact_level) }}
                  </span>
                </td>
                <td>{{ error.error_category || 'N/A' }}</td>
                <td>
                  <span v-if="error.parsed_data?.location?.file" style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 12px;">
                    {{ error.parsed_data.location.file }}{{ error.parsed_data.location.line ? ':' + error.parsed_data.location.line : '' }}
                  </span>
                  <span v-else>N/A</span>
                </td>
                <td>
                  <button @click="saveSingleError(error, index)" class="btn-save-single" :disabled="savingErrors[index]">
                    <span v-if="!savingErrors[index]">💾</span>
                    <span v-else class="loading-spinner-small"></span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else style="padding: 20px; text-align: center; color: #666; background: #f8f9fa; border-radius: 8px;">
            <p>에러 목록을 불러오는 중이거나 표시할 에러가 없습니다.</p>
          </div>
        </div>
      </div>
      
      <!-- 저장된 에러 로그 목록 -->
      <div v-if="savedErrorsList && savedErrorsList.length > 0" class="analysis-section saved-errors-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h4 style="margin: 0;">💾 저장된 에러 로그 목록 ({{ savedErrorsList.length }}건)</h4>
          <button @click="savedErrorsList = []" class="btn-clear-list">목록 닫기</button>
        </div>
        <div style="overflow-x: auto;">
          <table class="error-analysis-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>저장일시</th>
                <th>발생일시</th>
                <th>에러 타입</th>
                <th>심각도</th>
                <th>영향도</th>
                <th>카테고리</th>
                <th>에러 내용</th>
                <th>발생 위치</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(error, index) in savedErrorsList" :key="error.id || index">
                <td>{{ index + 1 }}</td>
                <td>{{ formatDateTime(error.created_at) }}</td>
                <td>{{ formatDateTime(error.timestamp) }}</td>
                <td>{{ error.error_type || error.metadata?.error_type || error.parsed_data?.error?.type || 'N/A' }}</td>
                <td>
                  <span :class="getSeverityClass(error.severity || error.metadata?.severity)">
                    {{ error.severity || error.metadata?.severity || 'ERROR' }}
                  </span>
                </td>
                <td>
                  <span :class="getImpactClass(error.metadata?.impact_level || error.parsed_data?.impact_level)">
                    {{ getImpactLabel(error.metadata?.impact_level || error.parsed_data?.impact_level) }}
                  </span>
                </td>
                <td>{{ error.error_category || error.metadata?.error_category || error.parsed_data?.error?.category || 'N/A' }}</td>
                <td style="max-width: 400px; word-break: break-word; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 12px; line-height: 1.4;">
                  <div style="max-height: 80px; overflow: auto; color: #333; padding: 4px 0;">
                    {{ getErrorContentPreview(error) }}
                  </div>
                </td>
                <td>
                  <span v-if="error.file_path || error.metadata?.file_path || error.parsed_data?.location?.file" style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 12px;">
                    {{ error.file_path || error.metadata?.file_path || error.parsed_data?.location?.file }}{{ (error.line_number || error.metadata?.line_number || error.parsed_data?.location?.line) ? ':' + (error.line_number || error.metadata?.line_number || error.parsed_data?.location?.line) : '' }}
                  </span>
                  <span v-else>N/A</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 메타데이터 -->
      <div v-if="errorLogAnalysisResult.metadata" class="analysis-section metadata-section">
        <h4>📊 메타데이터</h4>
        <div class="metadata-content">
          <div v-if="errorLogAnalysisResult.metadata.total_errors && errorLogAnalysisResult.metadata.total_errors > 1" class="metadata-item total-errors-info">
            <strong>전체 에러 개수:</strong> {{ errorLogAnalysisResult.metadata.total_errors }}개
            <span class="info-note">(현재 첫 번째 에러 분석 결과 표시 중)</span>
          </div>
          <div v-if="errorLogAnalysisResult.metadata.all_errors_summary && errorLogAnalysisResult.metadata.all_errors_summary.length > 0" class="metadata-item all-errors-summary">
            <strong>에러 목록 요약 (최대 5개):</strong>
            <ul class="errors-summary-list">
              <li v-for="err in errorLogAnalysisResult.metadata.all_errors_summary" :key="err.index" class="error-summary-item">
                <span class="error-index">#{{ err.index }}</span>
                <span class="error-type">{{ err.type }}</span>
                <span v-if="err.timestamp" class="error-timestamp">{{ err.timestamp }}</span>
              </li>
            </ul>
          </div>
          <div v-if="errorLogAnalysisResult.metadata.system_type" class="metadata-item">
            <strong>시스템 유형:</strong> {{ errorLogAnalysisResult.metadata.system_type }}
          </div>
          <div v-if="errorLogAnalysisResult.metadata.resource_type" class="metadata-item">
            <strong>리소스 유형:</strong> {{ errorLogAnalysisResult.metadata.resource_type }}
          </div>
          <div v-if="errorLogAnalysisResult.metadata.service_name" class="metadata-item">
            <strong>서비스명:</strong> {{ errorLogAnalysisResult.metadata.service_name }}
          </div>
          <div v-if="errorLogAnalysisResult.metadata.file_path" class="metadata-item">
            <strong>파일 경로:</strong> <code>{{ errorLogAnalysisResult.metadata.file_path }}</code>
          </div>
          <div v-if="errorLogAnalysisResult.metadata.line_number" class="metadata-item">
            <strong>라인 번호:</strong> {{ errorLogAnalysisResult.metadata.line_number }}
          </div>
          <div v-if="errorLogAnalysisResult.metadata.timestamp" class="metadata-item">
            <strong>발생 시간:</strong> {{ errorLogAnalysisResult.metadata.timestamp }}
          </div>
        </div>
      </div>
      
      <!-- 원본 로그 -->
      <div v-if="errorLogAnalysisResult.original_log" class="analysis-section original-log-section">
        <h4>📄 원본 로그</h4>
        <pre class="original-log-content">{{ errorLogAnalysisResult.original_log }}</pre>
      </div>
      
      <!-- 저장 버튼 및 메시지 -->
      <div class="analysis-actions save-actions">
        <!-- 여러 에러가 있을 때는 일괄 저장 버튼 표시, 단일 에러일 때는 분석 결과 저장 버튼 표시 -->
        <button 
          v-if="errorLogAnalysisResult?.metadata?.all_errors && errorLogAnalysisResult.metadata.all_errors.length > 1"
          @click="saveAllErrors" 
          class="btn-save-error-log" 
          :disabled="isSavingAllErrors || !errorLogAnalysisResult.metadata?.all_errors || errorLogAnalysisResult.metadata.all_errors.length === 0">
          <span class="btn-icon" v-if="!isSavingAllErrors">💾</span>
          <span class="loading-spinner" v-if="isSavingAllErrors"></span>
          <span class="btn-text">
            <span v-if="!isSavingAllErrors">에러 분석 결과 저장하기</span>
            <span v-else>저장 중 ({{ savedCount }}/{{ errorLogAnalysisResult.metadata?.all_errors?.length || 0 }})</span>
          </span>
        </button>
        <button 
          v-else
          @click="saveErrorLog" 
          class="btn-save-error-log" 
          :disabled="isSavingErrorLog">
          <span class="btn-icon" v-if="!isSavingErrorLog">💾</span>
          <span class="loading-spinner" v-if="isSavingErrorLog"></span>
          <span class="btn-text">
            <span v-if="!isSavingErrorLog">에러 분석 결과 저장하기</span>
            <span v-else>저장 중...</span>
          </span>
        </button>
        <div v-if="saveErrorLogMessage || saveAllErrorsMessage" class="save-message" :class="{ 'save-success': (saveErrorLogMessage || saveAllErrorsMessage).includes('✅'), 'save-error': (saveErrorLogMessage || saveAllErrorsMessage).includes('❌') }">
          {{ saveErrorLogMessage || saveAllErrorsMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getApiUrl } from '../config/api.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const errorLogFile = ref('')
const errorLogContent = ref('')
const isAnalyzingErrorLog = ref(false)
const errorLogAnalysisError = ref('')
const errorLogAnalysisResult = ref(null)
const isSavingErrorLog = ref(false)
const saveErrorLogMessage = ref('')
const isSavingAllErrors = ref(false)
const saveAllErrorsMessage = ref('')
const savedCount = ref(0)
const savingErrors = ref({})
const savedErrorsList = ref([])
const isLoadingSavedErrors = ref(false)

const analyzeErrorLog = async () => {
  // 이미 분석 중이면 중복 요청 방지
  if (isAnalyzingErrorLog.value) {
    console.log('[에러 로그 분석] 이미 분석 중입니다. 중복 요청을 무시합니다.')
    return
  }
  
  if (!errorLogContent.value.trim() && !errorLogFile.value.trim()) {
    errorLogAnalysisError.value = '에러 로그 내용 또는 파일 경로를 입력해주세요.'
    return
  }
  
  isAnalyzingErrorLog.value = true
  errorLogAnalysisError.value = ''
  errorLogAnalysisResult.value = null
  
  try {
    const requestBody = {
      log_file_path: errorLogFile.value.trim() || null,
      log_content: errorLogContent.value.trim() || null,
      workspace_path: null
    }
    
    console.log('[프론트엔드] 에러 로그 분석 요청:', requestBody)
    
    // 타임아웃 설정 (30초)
    const controller = new AbortController()
    let timeoutId = null
    
    try {
      timeoutId = setTimeout(() => {
        console.log('[에러 로그 분석] 타임아웃 발생 (30초)')
        controller.abort()
      }, 30000)
      
      const response = await fetch(getApiUrl('/api/error-log/analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP 오류: ${response.status}`)
      }
      
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('[에러 로그 분석] JSON 파싱 오류:', jsonError)
        throw new Error('서버 응답을 파싱할 수 없습니다.')
      }
      
      console.log('[프론트엔드] 에러 로그 분석 응답:', data)
      
      if (data.success) {
        if (!data.result) {
          throw new Error('서버 응답에 결과 데이터가 없습니다.')
        }
        errorLogAnalysisResult.value = data.result
        
        console.log('[프론트엔드] 분석 결과:', {
          has_metadata: !!errorLogAnalysisResult.value.metadata,
          total_errors: errorLogAnalysisResult.value.metadata?.total_errors,
          error_count: errorLogAnalysisResult.value.metadata?.error_count,
          all_errors_length: errorLogAnalysisResult.value.metadata?.all_errors?.length,
          all_errors_summary_length: errorLogAnalysisResult.value.metadata?.all_errors_summary?.length,
          error_type: errorLogAnalysisResult.value.error_type
        })
        
        // all_errors가 없고 단일 에러인 경우, all_errors 배열 생성
        if (!errorLogAnalysisResult.value.metadata?.all_errors && errorLogAnalysisResult.value.error_type) {
          if (!errorLogAnalysisResult.value.metadata) {
            errorLogAnalysisResult.value.metadata = {}
          }
          errorLogAnalysisResult.value.metadata.all_errors = [{
            index: 1,
            log_content: errorLogAnalysisResult.value.original_log || errorLogContent.value.trim(),
            timestamp: errorLogAnalysisResult.value.metadata?.timestamp || errorLogAnalysisResult.value.timestamp || new Date().toISOString(),
            log_type: errorLogAnalysisResult.value.log_type,
            system_type: errorLogAnalysisResult.value.system_type,
            error_type: errorLogAnalysisResult.value.error_type,
            error_category: errorLogAnalysisResult.value.error_category,
            severity: errorLogAnalysisResult.value.severity,
            impact_level: errorLogAnalysisResult.value.metadata?.impact_level || 'MEDIUM',
            parsed_data: errorLogAnalysisResult.value.metadata || {}
          }]
          errorLogAnalysisResult.value.metadata.total_errors = 1
        }
        
        errorLogAnalysisError.value = ''
      } else {
        errorLogAnalysisError.value = data.error || '에러 로그 분석에 실패했습니다.'
        errorLogAnalysisResult.value = null
      }
    } catch (fetchError) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      throw fetchError
    }
  } catch (error) {
    console.error('에러 로그 분석 오류:', error)
    let errorMessage = error.message || '에러 로그 분석 중 오류가 발생했습니다.'
    
    // 타임아웃 오류인 경우
    if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('aborted')) {
      // 타임아웃 발생 시에도 로그 내용을 직접 분석하여 결과 표시
      const logContent = errorLogContent.value.trim()
      if (logContent) {
        console.log('[에러 로그 분석] 타임아웃 발생, 빠른 분석 모드로 전환')
        
        // 빠른 분석 수행
        let logType = 'application'
        let errorType = 'Unknown'
        let errorCategory = 'General'
        let severity = 'ERROR'
        
        // 로그 타입 감지
        if (logContent.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          logType = 'iso8601'
        } else if (logContent.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
          logType = 'standard'
        }
        
        // 에러 타입 분석
        if (logContent.includes('Database') || logContent.includes('connection failed') || logContent.includes('MySQL') || logContent.includes('PostgreSQL') || logContent.includes('MongoDB')) {
          errorType = 'Database Error'
          errorCategory = 'Database'
        } else if (logContent.includes('Network') || logContent.includes('timeout') || logContent.includes('Connection timeout') || logContent.includes('ETIMEDOUT') || logContent.includes('ECONNREFUSED')) {
          errorType = 'Network Error'
          errorCategory = 'Network'
          if (logContent.includes('Connection timeout')) {
            errorType = 'Connection Timeout Error'
          }
        } else if (logContent.includes('Authentication') || logContent.includes('Unauthorized') || logContent.includes('JWT')) {
          errorType = 'Authentication Error'
          errorCategory = 'Security'
        } else if (logContent.includes('File') || logContent.includes('ENOENT') || logContent.includes('EACCES')) {
          errorType = 'File System Error'
          errorCategory = 'File System'
        } else if (logContent.includes('Memory') || logContent.includes('Heap') || logContent.includes('Out of memory')) {
          errorType = 'Memory Error'
          errorCategory = 'Performance'
          severity = 'CRITICAL'
        }
        
        // severity 추출
        if (logContent.match(/CRITICAL|FATAL/i)) {
          severity = 'CRITICAL'
        } else if (logContent.match(/WARNING|WARN/i)) {
          severity = 'WARNING'
        } else if (logContent.match(/ERROR/i)) {
          severity = 'ERROR'
        }
        
        // 빠른 분석 결과 표시
        errorLogAnalysisResult.value = {
          log_type: logType,
          system_type: logType,
          error_type: errorType,
          error_category: errorCategory,
          severity: severity,
          summary: `빠른 분석 모드: ${errorType}가 감지되었습니다. (서버 응답 타임아웃으로 인해 빠른 분석 모드로 전환되었습니다.)`,
          root_cause: `로그 분석 결과 "${errorType}" 유형의 에러가 발견되었습니다.`,
          solutions: [
            '에러 로그를 자세히 검토하여 근본 원인을 파악하세요.',
            '에러 타입에 따라 적절한 해결 방안을 적용하세요.',
            '시스템 모니터링을 강화하여 유사한 에러를 사전에 방지하세요.'
          ],
          metadata: {
            log_type: logType,
            system_type: logType,
            error_count: 1,
            analysis_mode: 'quick',
            original_log: logContent // 전체 원본 로그 보존
          },
          original_log: logContent // 전체 원본 로그 보존
        }
        errorLogAnalysisError.value = ''
        return
      }
      
      errorMessage = '요청 시간이 초과되었습니다. (30초) 빠른 분석 모드로 전환되었습니다.'
    } else if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('NetworkError'))) {
      errorMessage = 'API 서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인하세요.\n\n해결 방법:\n1. 터미널에서 "npm run api-server" 명령어를 실행하세요.\n2. API 서버가 http://localhost:3011 에서 실행 중인지 확인하세요.'
    }
    
    errorLogAnalysisError.value = errorMessage
    console.error('[에러 로그 분석] 오류:', errorMessage)
  } finally {
    isAnalyzingErrorLog.value = false
  }
}

const clearErrorLogAnalysis = () => {
  errorLogFile.value = ''
  errorLogContent.value = ''
  errorLogAnalysisError.value = ''
  errorLogAnalysisResult.value = null
  saveErrorLogMessage.value = ''
  saveAllErrorsMessage.value = ''
  savedCount.value = 0
  savingErrors.value = {}
  savedErrorsList.value = []
}

// 순환 참조 제거 헬퍼 함수
const removeCircularReferences = (obj, seen = new WeakSet()) => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (seen.has(obj)) {
    return undefined // 순환 참조 제거
  }
  
  seen.add(obj)
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeCircularReferences(item, seen))
  }
  
  const cleaned = {}
  for (const key in obj) {
    // 순환 참조를 일으킬 수 있는 속성 제외
    if (key === 'all_errors' || key === 'all_errors_summary' || key === 'error_statistics') {
      continue
    }
    const value = removeCircularReferences(obj[key], seen)
    if (value !== undefined) {
      cleaned[key] = value
    }
  }
  
  return cleaned
}

const saveAllErrors = async () => {
  if (!errorLogAnalysisResult.value || !errorLogAnalysisResult.value.metadata?.all_errors || errorLogAnalysisResult.value.metadata.all_errors.length === 0) {
    saveAllErrorsMessage.value = '❌ 저장할 에러가 없습니다.'
    return
  }
  
  if (isSavingAllErrors.value) {
    return
  }
  
  isSavingAllErrors.value = true
  saveAllErrorsMessage.value = ''
  savedCount.value = 0
  let failedCount = 0
  const totalErrors = errorLogAnalysisResult.value.metadata.all_errors.length
  
  try {
    const savePromises = errorLogAnalysisResult.value.metadata.all_errors.map(async (errorData, index) => {
      try {
        // 순환 참조 제거
        const cleanedParsedData = removeCircularReferences(errorData.parsed_data || {})
        
        const errorMetadata = {
          ...cleanedParsedData,
          log_type: errorData.log_type || errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
          system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
          error_type: errorData.error_type || errorData.type,
          error_category: errorData.error_category,
          severity: errorData.severity || 'ERROR',
          timestamp: errorData.timestamp,
          original_log: errorData.log_content,
          error_index: errorData.index,
          total_errors: totalErrors,
          impact_level: errorData.impact_level || 'MEDIUM'
        }
        
        const saveData = {
          log_content: errorData.log_content,
          log_type: errorData.log_type || errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
          parsed_data: errorMetadata,
          metadata: errorMetadata,
          system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
          error_type: errorData.error_type || errorData.type,
          error_category: errorData.error_category,
          severity: errorData.severity || 'ERROR',
          timestamp: errorData.timestamp
        }
        
        const response = await fetch(getApiUrl('/api/error-log/save'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(saveData)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP 오류: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success) {
          savedCount.value++
          return { success: true, error: null }
        } else {
          failedCount++
          return { success: false, error: data.error || '알 수 없는 오류' }
        }
      } catch (error) {
        failedCount++
        return { success: false, error: error.message }
      }
    })
    
    // 모든 저장 요청 완료 대기
    await Promise.all(savePromises)
    
    if (savedCount.value > 0) {
      saveAllErrorsMessage.value = `✅ 총 ${totalErrors}개의 에러 중 ${savedCount.value}개가 성공적으로 저장되었습니다.${failedCount > 0 ? ` (${failedCount}개 실패)` : ''}`
      // 저장 성공 시 목록 새로고침 이벤트 발생
      window.dispatchEvent(new CustomEvent('errorLogSaved'))
    } else {
      saveAllErrorsMessage.value = `❌ 저장 실패: 모든 에러 저장에 실패했습니다.`
    }
    
    setTimeout(() => {
      saveAllErrorsMessage.value = ''
    }, 5000)
  } catch (error) {
    console.error('일괄 저장 오류:', error)
    saveAllErrorsMessage.value = `❌ 일괄 저장 중 오류가 발생했습니다: ${error.message}`
  } finally {
    isSavingAllErrors.value = false
  }
}

// 날짜 시간 포맷팅 함수
function formatDateTime(dateString) {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return dateString
  }
}

const saveErrorLog = async () => {
  if (!errorLogAnalysisResult.value) {
    saveErrorLogMessage.value = '❌ 저장할 분석 결과가 없습니다.'
    return
  }
  
  if (isSavingErrorLog.value) {
    return
  }
  
  isSavingErrorLog.value = true
  saveErrorLogMessage.value = ''
  
  try {
    // 원본 로그 전체 내용 확보 (우선순위: original_log > errorLogContent > 빈 문자열)
    const fullLogContent = errorLogAnalysisResult.value.original_log || errorLogContent.value.trim() || ''
    
    if (!fullLogContent) {
      throw new Error('저장할 로그 내용이 없습니다.')
    }
    
    // 여러 에러가 있는지 확인
    const totalErrors = errorLogAnalysisResult.value.metadata?.total_errors || errorLogAnalysisResult.value.metadata?.error_count || 1
    const allErrorsSummary = errorLogAnalysisResult.value.metadata?.all_errors_summary || []
    const allErrors = errorLogAnalysisResult.value.metadata?.all_errors || []
    
    console.log('[프론트엔드] 저장 전 에러 개수 확인:', {
      total_errors: errorLogAnalysisResult.value.metadata?.total_errors,
      error_count: errorLogAnalysisResult.value.metadata?.error_count,
      all_errors_length: allErrors.length,
      all_errors_summary_length: allErrorsSummary.length,
      calculated_totalErrors: totalErrors
    })
    
    // 여러 에러가 있는 경우, 각 에러를 개별적으로 저장
    // all_errors_summary가 없으면 all_errors 사용
    const errorsToSave = allErrorsSummary.length > 0 ? allErrorsSummary : allErrors
    console.log('[프론트엔드] 저장할 에러 개수:', errorsToSave.length, 'totalErrors:', totalErrors)
    
    if (totalErrors > 1 && errorsToSave.length > 0) {
      // 원본 로그를 라인별로 분리
      const logLines = fullLogContent.split('\n').filter(line => line.trim())
      
      // 각 에러를 개별적으로 저장
      const savePromises = []
      let savedCount = 0
      let failedCount = 0
      
      for (let i = 0; i < Math.min(errorsToSave.length, totalErrors); i++) {
        const errorInfo = errorsToSave[i]
        
        // 해당 에러의 로그 라인 찾기 (타임스탬프나 에러 타입으로 매칭)
        let errorLogLine = ''
        if (errorInfo.timestamp) {
          // 타임스탬프로 매칭
          errorLogLine = logLines.find(line => line.includes(errorInfo.timestamp)) || logLines[i] || ''
        } else {
          // 인덱스로 매칭
          errorLogLine = logLines[i] || ''
        }
        
        // 에러 타입별로 메타데이터 구성 (순환 참조 제거)
        const cleanedMetadata = removeCircularReferences(errorLogAnalysisResult.value.metadata || {})
        const errorMetadata = {
          ...cleanedMetadata,
          log_type: errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
          system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
          error_type: errorInfo.type || errorLogAnalysisResult.value.error_type,
          error_category: errorLogAnalysisResult.value.error_category,
          severity: errorInfo.severity || errorLogAnalysisResult.value.severity,
          timestamp: errorInfo.timestamp,
          original_log: errorLogLine,
          error_index: errorInfo.index,
          total_errors: totalErrors
        }
        
        const saveData = {
          log_content: errorLogLine,
          log_type: errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
          parsed_data: errorMetadata,
          metadata: errorMetadata,
          system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
          error_type: errorInfo.type || errorLogAnalysisResult.value.error_type,
          error_category: errorLogAnalysisResult.value.error_category,
          severity: errorInfo.severity || errorLogAnalysisResult.value.severity,
          timestamp: errorInfo.timestamp
        }
        
        // 각 에러를 개별적으로 저장
        const savePromise = fetch(getApiUrl('/api/error-log/save'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(saveData)
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`)
          }
          return response.json()
        })
        .then(data => {
          if (data.success) {
            savedCount++
            return { success: true, error: null }
          } else {
            failedCount++
            return { success: false, error: data.error || '알 수 없는 오류' }
          }
        })
        .catch(error => {
          failedCount++
          return { success: false, error: error.message }
        })
        
        savePromises.push(savePromise)
      }
      
      // 모든 저장 요청 완료 대기
      await Promise.all(savePromises)
      
      if (savedCount > 0) {
        saveErrorLogMessage.value = `✅ 총 ${totalErrors}개의 에러 중 ${savedCount}개가 성공적으로 저장되었습니다.${failedCount > 0 ? ` (${failedCount}개 실패)` : ''}`
        // 저장 성공 시 목록 새로고침 이벤트 발생
        window.dispatchEvent(new CustomEvent('errorLogSaved'))
      } else {
        saveErrorLogMessage.value = `❌ 저장 실패: 모든 에러 저장에 실패했습니다.`
      }
      
      setTimeout(() => {
        saveErrorLogMessage.value = ''
      }, 5000)
    } else {
      // 단일 에러인 경우 기존 로직 사용 (순환 참조 제거)
      const cleanedMetadata = removeCircularReferences(errorLogAnalysisResult.value.metadata || {})
      const metadata = {
        ...cleanedMetadata,
        log_type: errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
        system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
        error_type: errorLogAnalysisResult.value.error_type,
        error_category: errorLogAnalysisResult.value.error_category,
        severity: errorLogAnalysisResult.value.severity,
        original_log: fullLogContent
      }
      
      // timestamp 추출 (우선순위: parsed_data.timestamp > metadata.occurred_at > 현재 시간)
      const timestamp = metadata.timestamp || 
                       errorLogAnalysisResult.value.metadata?.all_errors?.[0]?.timestamp ||
                       errorLogAnalysisResult.value.metadata?.all_errors_summary?.[0]?.timestamp ||
                       new Date().toISOString();
      
      const saveData = {
        log_content: fullLogContent,
        log_type: errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
        parsed_data: metadata,
        metadata: metadata,
        system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
        error_type: errorLogAnalysisResult.value.error_type,
        error_category: errorLogAnalysisResult.value.error_category,
        severity: errorLogAnalysisResult.value.severity,
        timestamp: timestamp // timestamp 명시적으로 전달
      }
      
      console.log('[프론트엔드] 에러 로그 저장 요청:', saveData)
      console.log('[프론트엔드] timestamp:', timestamp)
      
      const response = await fetch(getApiUrl('/api/error-log/save'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP 오류: ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log('[프론트엔드] 저장 응답:', data)
      
      if (data.success) {
        console.log('[프론트엔드] 저장 성공, 저장된 로그:', data.result)
        saveErrorLogMessage.value = '✅ 에러 로그가 성공적으로 저장되었습니다.'
        // 저장 성공 시 목록 새로고침 이벤트 발생
        window.dispatchEvent(new CustomEvent('errorLogSaved'))
        setTimeout(() => {
          saveErrorLogMessage.value = ''
        }, 3000)
      } else {
        console.error('[프론트엔드] 저장 실패:', data.error)
        saveErrorLogMessage.value = `❌ 저장 실패: ${data.error || '알 수 없는 오류'}`
      }
    }
  } catch (error) {
    console.error('에러 로그 저장 오류:', error)
    saveErrorLogMessage.value = `❌ 저장 중 오류가 발생했습니다: ${error.message}`
  } finally {
    isSavingErrorLog.value = false
  }
}

const getSeverityClass = (severity) => {
  if (!severity) return ''
  const severityLower = severity.toLowerCase()
  if (severityLower === 'critical' || severityLower === 'high') return 'severity-high'
  if (severityLower === 'medium') return 'severity-medium'
  if (severityLower === 'low') return 'severity-low'
  return ''
}

const getLogTypeLabel = (logType) => {
  if (!logType) return '알 수 없음'
  const typeMap = {
    'gcp_json': 'Google Cloud Platform (JSON)',
    'gcp_text': 'Google Cloud Platform (텍스트)',
    'aws': 'AWS CloudWatch',
    'azure': 'Azure Monitor',
    'nodejs': 'Node.js / Express',
    'python': 'Python / Django',
    'java': 'Java / Spring Boot',
    'php': 'PHP',
    'iso8601': 'ISO8601 형식',
    'standard': '표준 형식',
    'application': '일반 애플리케이션 로그',
    'unknown': '알 수 없음'
  }
  return typeMap[logType.toLowerCase()] || logType
}

const getImpactLabel = (impactLevel) => {
  if (!impactLevel) return '알 수 없음'
  const impactMap = {
    'HIGH': '높음',
    'MEDIUM': '중간',
    'LOW': '낮음'
  }
  return impactMap[impactLevel.toUpperCase()] || impactLevel
}

const getImpactClass = (impactLevel) => {
  if (!impactLevel) return ''
  const level = impactLevel.toUpperCase()
  if (level === 'HIGH') return 'impact-high'
  if (level === 'MEDIUM') return 'impact-medium'
  if (level === 'LOW') return 'impact-low'
  return ''
}

// 에러 내용 미리보기 추출 함수
const getErrorContentPreview = (error) => {
  // 우선순위: log_content > parsed_data.log_content > parsed_data.original_log > parsed_data.message > metadata.analysis_data
  const errorContent = error.log_content || 
                       error.parsed_data?.log_content || 
                       error.parsed_data?.original_log ||
                       error.parsed_data?.message ||
                       error.metadata?.analysis_data?.message ||
                       error.error_type ||
                       '내용 없음'
  
  // 여러 줄인 경우 첫 줄만 추출하고, 너무 길면 잘라내기
  const firstLine = errorContent.split('\n')[0].trim()
  if (firstLine.length > 200) {
    return firstLine.substring(0, 200) + '...'
  }
  return firstLine || '내용 없음'
}

const saveSingleError = async (error, index) => {
  if (savingErrors.value[index]) {
    return
  }
  
  savingErrors.value[index] = true
  
  try {
    // parsed_data에서 순환 참조 제거
    const cleanedParsedData = removeCircularReferences(error.parsed_data || {})
    
    const errorMetadata = {
      ...cleanedParsedData,
      log_type: error.log_type || errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
      system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
      error_type: error.error_type || error.type,
      error_category: error.error_category,
      severity: error.severity || 'ERROR',
      timestamp: error.timestamp,
      original_log: error.log_content,
      error_index: error.index,
      impact_level: error.impact_level || 'MEDIUM'
    }
    
    const saveData = {
      log_content: error.log_content,
      log_type: error.log_type || errorLogAnalysisResult.value.log_type || errorLogAnalysisResult.value.metadata?.log_type,
      parsed_data: errorMetadata,
      metadata: errorMetadata,
      system_type: errorLogAnalysisResult.value.system_type || errorLogAnalysisResult.value.metadata?.system_type,
      error_type: error.error_type || error.type,
      error_category: error.error_category,
      severity: error.severity || 'ERROR',
      timestamp: error.timestamp
    }
    
    const response = await fetch(getApiUrl('/api/error-log/save'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      // 성공 메시지 표시
      const successMsg = `✅ 에러 #${error.index || index + 1} 저장 완료`
      if (!saveAllErrorsMessage.value) {
        saveAllErrorsMessage.value = successMsg
        setTimeout(() => {
          saveAllErrorsMessage.value = ''
        }, 3000)
      }
    } else {
      throw new Error(data.error || '알 수 없는 오류')
    }
  } catch (error) {
    console.error('개별 에러 저장 오류:', error)
    const errorMsg = `❌ 에러 #${index + 1} 저장 실패: ${error.message}`
    if (!saveAllErrorsMessage.value) {
      saveAllErrorsMessage.value = errorMsg
      setTimeout(() => {
        saveAllErrorsMessage.value = ''
      }, 5000)
    }
  } finally {
    savingErrors.value[index] = false
  }
}

const loadSavedErrors = async () => {
  isLoadingSavedErrors.value = true
  savedErrorsList.value = []
  
  try {
    // 그룹화 없이 개별 로그 조회
    const response = await fetch(getApiUrl('/api/error-log/history?limit=100&groupBy=none'))
    
    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`)
    }
    
    const data = await response.json()
    
    console.log('[저장된 에러 로그 조회] 응답 데이터:', data)
    
    if (data.success) {
      let errors = data.result || data.data || []
      
      // 그룹화된 데이터인 경우 평탄화
      if (Array.isArray(errors) && errors.length > 0 && errors[0].date && errors[0].errors) {
        console.log('[저장된 에러 로그 조회] 그룹화된 데이터 감지, 평탄화 중...')
        errors = errors.flatMap(group => group.errors || [])
      }
      
      // 각 에러의 데이터 구조 정규화
      errors = errors.map(error => {
        // parsed_data가 문자열인 경우 파싱
        if (typeof error.parsed_data === 'string') {
          try {
            error.parsed_data = JSON.parse(error.parsed_data)
          } catch (e) {
            console.warn('[저장된 에러 로그 조회] parsed_data 파싱 실패:', e)
          }
        }
        
        // metadata가 문자열인 경우 파싱
        if (error.metadata && typeof error.metadata.analysis_data === 'string') {
          try {
            error.metadata.analysis_data = JSON.parse(error.metadata.analysis_data)
          } catch (e) {
            console.warn('[저장된 에러 로그 조회] analysis_data 파싱 실패:', e)
          }
        }
        
        return error
      })
      
      savedErrorsList.value = errors.sort((a, b) => {
        const dateA = new Date(a.created_at || a.timestamp || a.metadata?.occurred_at || 0)
        const dateB = new Date(b.created_at || b.timestamp || b.metadata?.occurred_at || 0)
        return dateB - dateA
      })
      
      console.log('[저장된 에러 로그 조회] 로드 완료:', savedErrorsList.value.length, '개')
      if (savedErrorsList.value.length > 0) {
        console.log('[저장된 에러 로그 조회] 첫 번째 로그:', savedErrorsList.value[0])
      }
    } else {
      throw new Error(data.error || '저장된 에러 로그를 불러올 수 없습니다.')
    }
  } catch (error) {
    console.error('저장된 에러 로그 조회 오류:', error)
    saveAllErrorsMessage.value = `❌ 저장된 에러 로그 조회 실패: ${error.message}`
    setTimeout(() => {
      saveAllErrorsMessage.value = ''
    }, 5000)
  } finally {
    isLoadingSavedErrors.value = false
  }
}
</script>

<style scoped>
.error-log-analysis-container {
  background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);
  border-radius: 20px;
  padding: 2.5rem;
  margin-top: 2rem;
  box-shadow: 
    0 10px 40px rgba(255, 140, 66, 0.15),
    0 0 0 1px rgba(255, 140, 66, 0.1);
  border: 1px solid rgba(255, 140, 66, 0.2);
  position: relative;
  overflow: hidden;
}

.error-log-analysis-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ff6b35 0%, #ff8c42 50%, #f5576c 100%);
}

.analysis-notice {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0cc 100%);
  border-left: 5px solid #ff8c42;
  padding: 1.25rem;
  margin-bottom: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.2);
}

.analysis-notice p {
  margin: 0.5rem 0;
  color: #e65100;
  font-size: 14px;
  line-height: 1.6;
}

.error-log-textarea {
  width: 100%;
  min-height: 300px;
  padding: 1.25rem;
  font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: 2px solid rgba(255, 140, 66, 0.3);
  border-radius: 12px;
  background: #ffffff;
  color: #333;
  resize: vertical;
  transition: all 0.3s ease;
}

.error-log-textarea:focus {
  outline: none;
  border-color: #ff8c42;
  box-shadow: 0 4px 20px rgba(255, 140, 66, 0.2);
}

.analysis-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.btn-analyze-error-log {
  flex: 1;
  min-width: 250px;
  background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 50%, #ffa726 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 1.25rem 2.5rem;
  border-radius: 14px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 6px 24px rgba(255, 107, 53, 0.45),
    0 2px 8px rgba(255, 140, 66, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.btn-analyze-error-log:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 
    0 12px 36px rgba(255, 107, 53, 0.6),
    0 4px 12px rgba(255, 140, 66, 0.4);
}

.btn-analyze-error-log:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-clear-error-log {
  padding: 1.25rem 2.5rem;
  background: linear-gradient(135deg, #fff8f0 0%, #ffe0cc 100%);
  color: #ff6b35;
  border: 2px solid #ff8c42;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-clear-error-log:hover {
  background: linear-gradient(135deg, #ffe0cc 0%, #ffcc99 100%);
  transform: translateY(-3px);
}

.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-log-analysis-results {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #fffefb;
  border-radius: 12px;
}

.analysis-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

.analysis-section h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
  font-size: 18px;
  font-weight: 700;
}

.log-type-section {
  background: linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%);
  border-left: 4px solid #2196f3;
}

.log-type-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.log-type-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.log-type-badge strong {
  color: #666;
  font-size: 14px;
  min-width: 140px;
}

.log-type-value {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.summary-section {
  border-left: 4px solid #4a90e2;
}

.error-type-info p {
  margin: 0.5rem 0;
  color: #333;
}

.severity-high {
  color: #d32f2f;
  font-weight: 700;
}

.severity-medium {
  color: #f57c00;
  font-weight: 600;
}

.severity-low {
  color: #388e3c;
  font-weight: 600;
}

.impact-high {
  color: #d32f2f;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: #ffebee;
}

.impact-medium {
  color: #f57c00;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: #fff3e0;
}

.impact-low {
  color: #388e3c;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: #e8f5e9;
}

.root-cause-content {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #ff8c42;
}

.root-cause-content p {
  margin: 0;
  color: #333;
  line-height: 1.6;
}

.solutions-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.solution-item {
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
  color: #333;
  line-height: 1.5;
}

/* 해결 방안 개선된 스타일 */
.solution-item-enhanced {
  display: flex;
  gap: 16px;
  padding: 20px;
  margin-bottom: 20px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.solution-item-enhanced:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.solution-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 2px 6px rgba(79, 172, 254, 0.3);
}

.solution-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.solution-title {
  font-size: 18px;
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 8px;
  line-height: 1.4;
}

.solution-description {
  font-size: 15px;
  color: #555;
  line-height: 1.7;
  margin-bottom: 12px;
}

.solution-steps {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4facfe;
}

.solution-steps strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.solution-steps ol {
  margin: 0;
  padding-left: 24px;
  color: #555;
}

.solution-steps li {
  margin-bottom: 8px;
  line-height: 1.6;
  font-size: 14px;
}

.solution-code {
  margin-top: 12px;
  padding: 16px;
  background: #2d2d2d;
  border-radius: 8px;
  border-left: 4px solid #4facfe;
}

.solution-code strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #f8f8f2;
  margin-bottom: 12px;
}

.solution-code pre {
  margin: 0;
  padding: 0;
  background: transparent;
  color: #f8f8f2;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.solution-code code {
  background: transparent;
  padding: 0;
  color: #f8f8f2;
  font-family: inherit;
}

.metadata-section {
  background: #f0f8ff;
}

.metadata-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metadata-item {
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 14px;
}

.metadata-item code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.total-errors-info {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.info-note {
  color: #856404;
  font-size: 12px;
  margin-left: 0.5rem;
}

.all-errors-summary {
  background: #e7f3ff;
  border-left: 4px solid #2196f3;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.errors-summary-list {
  list-style: none;
  padding-left: 0;
  margin: 0.5rem 0 0 0;
}

.error-summary-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: white;
  border-radius: 4px;
  font-size: 13px;
}

.error-index {
  font-weight: 700;
  color: #2196f3;
  min-width: 30px;
}

.error-type {
  flex: 1;
  color: #333;
}

.error-timestamp {
  color: #666;
  font-size: 11px;
}

.save-actions {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
}

.btn-save-error-log {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-save-error-log:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.btn-save-error-log:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.save-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.save-success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.save-error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #f44336;
}

.original-log-section {
  background: #2d2d2d;
  color: #f8f8f2;
}

.original-log-content {
  background: #1e1e1e;
  color: #f8f8f2;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.error {
  margin-top: 1rem;
  padding: 1rem;
  background: #ffebee;
  border-radius: 8px;
  border: 2px solid #f44336;
  color: #c62828;
  font-weight: 600;
}

.error p {
  margin: 0;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: #ff8c42;
  box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.1);
}

.error-analysis-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.error-analysis-table thead {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.error-analysis-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #ddd;
  font-size: 13px;
}

.error-analysis-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
  color: #333;
}

.error-analysis-table tbody tr:hover {
  background: #f8f9fa;
}

.error-analysis-table tbody tr:last-child td {
  border-bottom: none;
}

.btn-save-all-errors {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.btn-save-all-errors:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.btn-save-all-errors:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-load-saved {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.btn-load-saved:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

.btn-load-saved:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-save-single {
  padding: 6px 12px;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.btn-save-single:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}

.btn-save-single:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.btn-clear-list {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear-list:hover {
  background: #e8e8e8;
  border-color: #ccc;
}

.saved-errors-section {
  background: #f0f8ff;
  border-left: 4px solid #2196f3;
}
</style>

