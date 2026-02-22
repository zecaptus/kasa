import { describe, expect, it } from 'vitest';
import authReducer, {
  type AuthState,
  initialized,
  loggedOut,
  userLoaded,
} from '../../../src/store/authSlice';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

const mockUser = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  locale: 'FR' as const,
};

describe('authSlice', () => {
  it('has correct initial state', () => {
    const state = authReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  it('userLoaded sets user and marks authenticated + initialized', () => {
    const state = authReducer(initialState, userLoaded(mockUser));
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitialized).toBe(true);
  });

  it('loggedOut clears user and marks not authenticated + initialized', () => {
    const loggedInState: AuthState = {
      user: mockUser,
      isAuthenticated: true,
      isInitialized: true,
    };
    const state = authReducer(loggedInState, loggedOut());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it('initialized only sets isInitialized without changing auth', () => {
    const state = authReducer(initialState, initialized());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });
});
