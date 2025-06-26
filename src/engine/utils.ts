/**
 * Helper function to parse time windows and durations
 */
export function parseTimeWindow(timeWindow?: {
  start?: string
  end?: string
  duration?: string
}, defaultDuration = '7 days'): { start: string; end: string } {
  const now = new Date()
  
  if (timeWindow?.start && timeWindow?.end) {
    // Use explicit start and end dates
    return {
      start: timeWindow.start,
      end: timeWindow.end
    }
  }
  
  // Parse duration string (e.g., "10 days", "2 weeks", "1 month")
  const duration = timeWindow?.duration || defaultDuration
  let daysBack = 7 // default
  
  const match = duration.match(/(\d+)\s*(days?|weeks?|months?)/i)
  if (match) {
    const amount = parseInt(match[1])
    const unit = match[2].toLowerCase()
    
    switch (unit) {
      case 'day':
      case 'days':
        daysBack = amount
        break
      case 'week':
      case 'weeks':
        daysBack = amount * 7
        break
      case 'month':
      case 'months':
        daysBack = amount * 30
        break
    }
  }
  
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
  
  return {
    start: startDate.toISOString(),
    end: now.toISOString()
  }
}

export function normalizeCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
} 