export function getApiErrorMessage(error, fallback = 'Request failed') {
  const data = error?.response?.data;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) => (typeof item === 'string' ? item : item?.message || JSON.stringify(item)))
      .join(', ');
  }

  if (data?.errors && typeof data.errors === 'object') {
    return Object.values(data.errors)
      .flat()
      .map((item) => String(item))
      .join(', ');
  }

  return fallback;
}
