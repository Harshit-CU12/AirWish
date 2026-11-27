import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { playAlertChime, requestBrowserNotification } from './alertSound';

describe('Alert Sound & Browser Notification Synthesizer', () => {
  it('playAlertChime executes without crashing when Web Audio API is unavailable in Node', () => {
    assert.doesNotThrow(() => {
      playAlertChime('warning');
    });

    assert.doesNotThrow(() => {
      playAlertChime('safe_mode');
    });
  });

  it('requestBrowserNotification executes without throwing in headless environments', () => {
    assert.doesNotThrow(() => {
      requestBrowserNotification(
        'Severe Smog Emergency Alert',
        'AQI 450 detected at Anand Vihar. Seal windows and engage Turbo HEPA.'
      );
    });
  });
});
