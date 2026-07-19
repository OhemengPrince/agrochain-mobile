export function getApiErrorMessage(err: any, fallback: string): string {
  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. Check your internet connection and try again.';
  }
  if (!err?.response) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  return err?.response?.data?.message ?? fallback;
}
