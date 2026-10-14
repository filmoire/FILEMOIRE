/** Build-time UI mode. The server independently enforces APP_MODE. */
export const isLive = process.env.NEXT_PUBLIC_APP_MODE === 'live';
