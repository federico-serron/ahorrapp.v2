import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { Context } from '../js/store/appContext';
import { useAuth } from './useAuth';

/**
 * Regression coverage for T009/T010: useAuth.js (cookie/store-based) is the
 * only session source of truth in the app. The sibling hook that decoded a
 * JWT from localStorage (useAuthLocalStorage.js) was dead code and has been
 * deleted; these tests exercise the surviving hook's real contract.
 */

function makeWrapper(store, actions) {
  return function Wrapper({ children }) {
    return <Context.Provider value={{ store, actions }}>{children}</Context.Provider>;
  };
}

describe('useAuth', () => {
  it('reports isAuthenticated=true when logged_user has data and user is loaded', async () => {
    const store = { user_loaded: true, logged_user: { user_id: 5 } };
    const actions = { getCurrentUser: vi.fn() };

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(store, actions) });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe(5);
    expect(actions.getCurrentUser).not.toHaveBeenCalled();
  });

  it('reports isAuthenticated=false when logged_user is empty', async () => {
    const store = { user_loaded: true, logged_user: {} };
    const actions = { getCurrentUser: vi.fn() };

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(store, actions) });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBe(null);
  });

  it('fetches the current user when the store has not loaded it yet', async () => {
    const store = { user_loaded: false, logged_user: {} };
    const actions = { getCurrentUser: vi.fn().mockResolvedValue(null) };

    renderHook(() => useAuth(), { wrapper: makeWrapper(store, actions) });

    await waitFor(() => expect(actions.getCurrentUser).toHaveBeenCalledTimes(1));
  });

  it('no longer ships a localStorage-based auth hook (useAuthLocalStorage.js was removed)', async () => {
    const hooksDir = import.meta.glob('./*.js', { eager: false });
    expect(Object.keys(hooksDir)).not.toContain('./useAuthLocalStorage.js');
  });
});
