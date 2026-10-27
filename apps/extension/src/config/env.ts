let serverOrigin = "";
export function setServerOrigin(origin: string): void { serverOrigin = origin; }
export const env = { get VITE_APP_URL() { return serverOrigin; } };
