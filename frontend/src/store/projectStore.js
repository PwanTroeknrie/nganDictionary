import { useSyncExternalStore } from 'react';

const state = {
  projectId: 'default',
  authLevel: '',
  isGlobalEditMode: false,
};

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setState = (patch) => {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  emit();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const projectStore = {
  getState: () => state,
  setProject(projectId, authLevel) {
    setState((current) => ({
      projectId: projectId || 'default',
      authLevel: authLevel || '',
      isGlobalEditMode: authLevel ? current.isGlobalEditMode : false,
    }));
  },
  setGlobalEditMode(isGlobalEditMode) {
    setState({ isGlobalEditMode: Boolean(isGlobalEditMode && state.authLevel) });
  },
  toggleGlobalEditMode() {
    setState((current) => ({
      isGlobalEditMode: current.authLevel ? !current.isGlobalEditMode : false,
    }));
  },
};

export const useProjectStore = (selector = (value) => value) =>
  useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );

export const getAuthHeaders = (projectId = state.projectId) => {
  try {
    const stored = sessionStorage.getItem(`auth_${projectId}`);
    if (stored) {
      const { code } = JSON.parse(stored);
      if (code) return { 'X-Auth-Code': code, 'Content-Type': 'application/json' };
    }
  } catch {}
  return { 'Content-Type': 'application/json' };
};

export const getStoredAuthLevel = (projectId = state.projectId) => {
  try {
    const stored = sessionStorage.getItem(`auth_${projectId}`);
    if (stored) {
      const { level } = JSON.parse(stored);
      return level || '';
    }
  } catch {}
  return '';
};
