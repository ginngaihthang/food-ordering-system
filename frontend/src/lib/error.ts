import axios from 'axios';

// True when the request never got an answer (offline, server down, timeout)
export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Can't reach the server. Check your internet connection and try again.";
    }
    const message = (err.response.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}