export interface StoredSession {
  roomCode: string;
  playerId: string;
  playerName: string;
  avatar: string;
}

const SESSION_KEY = 'bootlegger_game_session';

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
  }
}

export function getSession(): StoredSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear session from localStorage', e);
  }
}
