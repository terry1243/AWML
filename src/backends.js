import { BackendValue } from './backend_value.js';
import { waitForDOMEvent } from './utils/subscribe_dom_event.js';

const backendValues = new Map();
const backends = new Map();

/**
 * Get the backend currently registered for the given name.
 *
 * @param name {string} The backend name.
 * @return {Backend}
 */
export function getBackend(name) {
  return backends.get(name);
}

/**
 * Waits for a backend with the given name to become available (i.e. `open`).
 */
export function waitForBackend(name) {
  if (backends.has(name)) {
    return Promise.resolve(backends.get(name));
  } else {
    return waitForDOMEvent(document, 'AWMLBackendRegistered').then((ev) => {
      return waitForBackend(name);
    });
  }
}

/** @ignore */
export function registerBackend(name, backend) {
  if (backends.has(name)) {
    throw new Error('Backend already exists.');
  }

  backends.set(name, backend);

  const values = backendValues.get(name);

  if (values !== void 0) {
    values.forEach((backendValue) => {
      backendValue.connectBackend(backend);
    });
  }

  const ev = new CustomEvent('AWMLBackendRegistered', {
    detail: {
      protocol: name,
      name: name,
      backend: backend,
    },
  });
  document.dispatchEvent(ev);
}

/** @ignore */
export function unregisterBackend(name, backend) {
  if (backend !== backends.get(name)) {
    throw new Error('Unregistering wrong backend.');
  }

  backends.delete(name);

  const values = backendValues.get(name);

  if (values !== void 0) {
    values.forEach((backendValue) => {
      backendValue.disconnectBackend();
    });
  }

  const ev = new CustomEvent('AWMLBackendUnregistered', {
    detail: {
      protocol: name,
      name: name,
      backend: backend,
    },
  });
  document.dispatchEvent(ev);
}

/**
 * Return a Map of all backend values which currently exist for the given
 * backend name.
 *
 * @return {Map<string,BackendValue>}
 */
export function getBackendValues(backendName) {
  let result = backendValues.get(backendName);

  if (result !== void 0) return result;

  result = new Map();

  backendValues.set(backendName, result);

  return result;
}

/**
 * Get the BackendValue for the given address. Addresses have the form
 * `<backendName>:<path>`.
 *
 * @param {string} address
 * @return {BackendValue}
 */
export function getBackendValue(address) {
  const pos = address.search(':');

  if (pos === -1) throw new TypeError('Bad address.');

  const backendName = address.substr(0, pos);
  const backendValues = getBackendValues(backendName);

  let backendValue = backendValues.get(address);

  if (backendValue !== void 0) return backendValue;

  backendValue = new BackendValue(address);
  backendValues.set(address, backendValue);

  const backend = getBackend(backendName);

  if (backend !== void 0) {
    backendValue.connectBackend(backend);
  }

  return backendValue;
}

/**
 * Return all backends.
 *
 * @return {Map<string,Backend>}
 */
export function getBackends() {
  return backends;
}
