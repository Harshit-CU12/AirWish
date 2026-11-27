import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary Component', () => {
  it('getDerivedStateFromError updates state to error state with original exception', () => {
    const error = new Error('ThreeJS Context Lost');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    assert.equal(state.hasError, true);
    assert.equal(state.error?.message, 'ThreeJS Context Lost');
  });
});
