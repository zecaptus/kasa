import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ReconciliationStatus } from '../services/importApi';

export interface ImportUiState {
  activeSessionId: string | null;
  statusFilter: ReconciliationStatus | 'ALL';
}

const initialState: ImportUiState = {
  activeSessionId: null,
  statusFilter: 'ALL',
};

const importSlice = createSlice({
  name: 'import',
  initialState,
  reducers: {
    setActiveSession(state, action: PayloadAction<string | null>) {
      state.activeSessionId = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<ReconciliationStatus | 'ALL'>) {
      state.statusFilter = action.payload;
    },
  },
});

export const { setActiveSession, setStatusFilter } = importSlice.actions;
export default importSlice.reducer;
