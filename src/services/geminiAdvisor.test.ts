import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  askGeminiAdvisor,
  getStoredGeminiKey,
  saveStoredGeminiKey,
  type AdvisoryRequest,
} from './geminiAdvisor';
import { MONITORING_STATIONS } from '../data/stations';
import { evaluateStationAqi } from '../utils/aqi';

describe('Gemini AI Smog Advisor Service', () => {
  it('getStoredGeminiKey and saveStoredGeminiKey handle missing window/sessionStorage safely in Node', () => {
    // In Node test runner, sessionStorage may not exist; functions should not throw
    assert.doesNotThrow(() => {
      const key = getStoredGeminiKey();
      assert.equal(typeof key, 'string');
    });

    assert.doesNotThrow(() => {
      saveStoredGeminiKey('test-key-12345');
      saveStoredGeminiKey('');
    });
  });

  it('askGeminiAdvisor throws an informative error when API key is blank', async () => {
    const station = MONITORING_STATIONS[0];
    const assessment = evaluateStationAqi(station.pollutants);

    const req: AdvisoryRequest = {
      station,
      assessment,
      rooms: [
        {
          id: 'room-1',
          name: 'Master Sanctuary',
          floor: '2nd Floor',
          areaSqM: 28,
          ceilingHeightM: 3.0,
          maxCadrM3h: 380,
          indoorPm25: 18,
          co2Ppm: 650,
          tempC: 22,
          humidityPct: 45,
          purifierMode: 'turbo',
          windowsSealed: true,
          hepaFilterLifePct: 92,
          assignedOccupants: ['Dad'],
        },
      ],
      members: [
        {
          id: 'member-1',
          name: 'Dad',
          age: 48,
          vulnerability: 'Asthma',
          primaryRoomId: 'room-1',
        },
      ],
      userQuery: 'Can I exercise in the garden this morning?',
    };

    await assert.rejects(
      async () => {
        await askGeminiAdvisor(req, '   ');
      },
      {
        message: 'Please provide a Gemini API key to activate the AI Medical Advisor.',
      }
    );
  });
});
