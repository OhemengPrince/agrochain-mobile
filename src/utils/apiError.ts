// The backend wraps Paystack's raw (JSON-stringified) gateway response inside
// its own error message, e.g. `Payment initiation failed: ... "{\"status\":false,
// \"message\":\"Charge attempted\",\"data\":{...,\"message\":\"Declined. ...\"},...}"`.
// Pull out the last (most specific — the gateway's data.message) "message"
// field instead of showing the whole escaped JSON blob to the user.
function extractPaystackMessage(raw: string): string | null {
  const matches = [...raw.matchAll(/\\?"message\\?":\\?"([^"\\]+)\\?"/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1];
}

export function getApiErrorMessage(err: any, fallback: string): string {
  if (err?.code === 'ECONNABORTED') {
    return 'The request timed out. Check your internet connection and try again.';
  }
  if (!err?.response) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  const raw = err?.response?.data?.message;
  if (typeof raw === 'string' && raw.includes('Payment initiation failed')) {
    return extractPaystackMessage(raw) ?? fallback;
  }
  return raw ?? fallback;
}
