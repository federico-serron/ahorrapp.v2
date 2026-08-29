import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import getState from './flux';

/**
 * Regression coverage for T011: the PayPal actions (createOrderPayPal,
 * captureOrderPayPal) must send credentials and the CSRF header like every
 * other mutating action in the store, instead of a bare headers object.
 */

function makeStore(initialStore, actions = {}) {
  let store = { ...initialStore };
  const getStore = () => store;
  const setStore = (updater) => {
    store = typeof updater === 'function' ? updater(store) : { ...store, ...updater };
  };
  const getActions = () => actions;
  const { actions: builtActions } = getState({ getStore, getActions, setStore });
  return { actions: builtActions, getStore };
}

describe('flux PayPal actions', () => {
  beforeEach(() => {
    document.cookie = 'csrf_access_token=fake-csrf-value';
    global.fetch = vi.fn();
  });

  afterEach(() => {
    document.cookie = 'csrf_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    vi.restoreAllMocks();
  });

  it('createOrderPayPal sends credentials and the CSRF header', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ links: [{ rel: 'approve', href: 'https://paypal.example/approve' }] }),
    });

    const { actions } = makeStore({ error: '' });
    const result = await actions.createOrderPayPal('10.00');

    expect(result).toBe('https://paypal.example/approve');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.credentials).toBe('include');
    expect(options.headers['X-CSRF-TOKEN']).toBe('fake-csrf-value');
  });

  it('captureOrderPayPal sends credentials and the CSRF header', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ status: 'COMPLETED' }),
    });

    const { actions } = makeStore({ error: '' });
    const result = await actions.captureOrderPayPal('ORDER123');

    expect(result).toEqual({ status: 'COMPLETED' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.credentials).toBe('include');
    expect(options.headers['X-CSRF-TOKEN']).toBe('fake-csrf-value');
  });
});
