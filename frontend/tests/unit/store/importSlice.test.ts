import { describe, expect, it } from 'vitest';
import importReducer, {
  type ImportUiState,
  setActiveSession,
  setStatusFilter,
} from '../../../src/store/importSlice';

describe('importSlice', () => {
  const initialState: ImportUiState = {
    activeSessionId: null,
    statusFilter: 'ALL',
  };

  it('returns initial state', () => {
    const state = importReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialState);
  });

  it('handles setActiveSession', () => {
    const state = importReducer(initialState, setActiveSession('session-123'));
    expect(state.activeSessionId).toBe('session-123');
  });

  it('handles setActiveSession with null', () => {
    const stateWithSession: ImportUiState = {
      activeSessionId: 'session-123',
      statusFilter: 'ALL',
    };
    const state = importReducer(stateWithSession, setActiveSession(null));
    expect(state.activeSessionId).toBeNull();
  });

  it('handles setStatusFilter', () => {
    const state = importReducer(initialState, setStatusFilter('RECONCILED'));
    expect(state.statusFilter).toBe('RECONCILED');
  });

  it('handles setStatusFilter with UNRECONCILED', () => {
    const state = importReducer(initialState, setStatusFilter('UNRECONCILED'));
    expect(state.statusFilter).toBe('UNRECONCILED');
  });

  it('handles setStatusFilter with IGNORED', () => {
    const state = importReducer(initialState, setStatusFilter('IGNORED'));
    expect(state.statusFilter).toBe('IGNORED');
  });

  it('handles setStatusFilter back to ALL', () => {
    const stateWithFilter: ImportUiState = {
      activeSessionId: null,
      statusFilter: 'RECONCILED',
    };
    const state = importReducer(stateWithFilter, setStatusFilter('ALL'));
    expect(state.statusFilter).toBe('ALL');
  });
});
