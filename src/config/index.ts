// Backend origin ONLY — no trailing slash and no `/api` suffix. Every endpoint
// path already begins with `/api/...`, so the suffix would double it
// (…/api/api/...) and 404. Matches the webapp's VITE_API_BASE_URL convention.
export const API_BASE_URL = 'https://staging.pdfform.enviromasternva.com';
