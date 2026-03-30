export const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    // In a real app we could send this to Datadog/Sentry
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    // Send to monitoring service
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  },
  action: (actionName, details) => {
    console.log(`[ACTION] ${new Date().toISOString()} - User Action: ${actionName}`, details || '');
  }
};
