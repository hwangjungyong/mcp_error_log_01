/**
 * 공통 유틸리티 함수
 */

/**
 * 날짜 시간 포맷팅
 * @param {string} dateString - 포맷팅할 날짜 문자열
 * @returns {string} 포맷팅된 날짜 시간 문자열
 */
export function formatDateTime(dateString) {
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
  } catch (error) {
    return dateString
  }
}

