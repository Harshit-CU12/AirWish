import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bot,
  Key,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { FamilyMember, MonitoringStation, RoomMonitor } from '../types/sentinel';
import type { AqiAssessment } from '../utils/aqi';
import { sanitizeAdvisorQuery } from '../utils/sanitization';
import {
  askGeminiAdvisor,
  getStoredGeminiKey,
  saveStoredGeminiKey,
} from '../services/geminiAdvisor';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: MonitoringStation;
  assessment: AqiAssessment;
  rooms: RoomMonitor[];
  members: FamilyMember[];
}

const SUGGESTED_QUERIES = [
  'Is it safe for children to attend morning sports at this AQI?',
  'Which room should the asthmatic member sleep in tonight?',
  'What purifier mode is best for the afternoon smog drop?',
  'What respirator grade is required for a 30-minute commute?',
];

export function AiAdvisorModal({
  isOpen,
  onClose,
  station,
  assessment,
  rooms,
  members,
}: AiAdvisorModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGeminiKey();
      setApiKey(stored);
      if (!stored) {
        setShowKeyInput(true);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleGenerate(customQuery?: string) {
    const rawQuery = customQuery !== undefined ? customQuery : query;
    const q = sanitizeAdvisorQuery(rawQuery);
    const keyToUse = apiKey.trim() || getStoredGeminiKey();

    if (!keyToUse) {
      setShowKeyInput(true);
      setError('Please provide your Gemini API key to query the advisor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      saveStoredGeminiKey(keyToUse);
      const text = await askGeminiAdvisor(
        {
          station,
          assessment,
          rooms,
          members,
          userQuery: q.trim() || undefined,
        },
        keyToUse
      );
      setResponse(text);
      if (customQuery !== undefined) {
        setQuery(customQuery);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while contacting Gemini.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-advisor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#2A364F] bg-[#0E1524] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A2438] px-6 py-4 bg-[#131B2E]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#06B6D4]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="ai-advisor-title" className="font-display text-base font-bold text-[#F8FAFC]">
                AirWish AI Smog &amp; Health Advisor
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Powered by Gemini · Clinical triage for {station.name} (AQI {assessment.aqi})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyInput((prev) => !prev)}
              aria-label="Toggle API Key configuration"
              className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC] transition-colors"
              title="Configure Gemini API Key"
            >
              <Key className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC] transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* API Key Drawer */}
          {showKeyInput && (
            <div className="rounded-xl border border-[#2A364F] bg-[#131B2E] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#F8FAFC]">
                <span>Gemini API Key</span>
                <span className="text-[11px] text-[#64748B]">Stored safely in session</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste your Gemini API key (AI Studio)"
                  className="sentinel-input flex-1 rounded-lg px-3 py-1.5 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    saveStoredGeminiKey(apiKey);
                    setShowKeyInput(false);
                  }}
                  className="rounded-lg bg-[#06B6D4] px-3 py-1.5 text-xs font-semibold text-[#090D16] hover:bg-[#38BDF8]"
                >
                  Save
                </button>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#38BDF8] underline">Google AI Studio</a>. Keys are never transmitted anywhere except directly to Google GenAI API.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#EF4444]/40 bg-[#7F1D1D]/25 p-3 text-xs text-[#FECACA]">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Suggested Queries */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[#94A3B8]">Suggested Inquiries:</span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => handleGenerate(sq)}
                  disabled={loading}
                  className="rounded-lg border border-[#2A364F] bg-[#131B2E] px-2.5 py-1 text-xs text-[#94A3B8] hover:border-[#06B6D4]/60 hover:text-[#F8FAFC] transition-colors text-left disabled:opacity-50"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>

          {/* Response Container */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="h-7 w-7 text-[#06B6D4] animate-spin" aria-hidden="true" />
              <p className="font-display text-sm font-semibold text-[#F8FAFC]">
                Analyzing telemetry &amp; synthesizing pulmonology guidance...
              </p>
              <p className="text-xs text-[#94A3B8]">
                Correlating CPCB criteria levels against household vulnerability profiles
              </p>
            </div>
          ) : response ? (
            <div className="rounded-xl border border-[#2A364F] bg-[#131B2E]/90 p-4.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#06B6D4]">
                <Bot className="h-4 w-4" aria-hidden="true" />
                <span>Clinical Advisory Report</span>
              </div>
              <div className="text-xs leading-relaxed text-[#F8FAFC] whitespace-pre-wrap font-sans space-y-2">
                {response}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#2A364F] p-8 text-center space-y-2">
              <Bot className="mx-auto h-8 w-8 text-[#64748B]" aria-hidden="true" />
              <p className="text-sm font-medium text-[#F8FAFC]">
                No assessment requested yet
              </p>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                Click a suggested inquiry above, or ask a custom question regarding current smog hazards for your family.
              </p>
            </div>
          )}
        </div>

        {/* Footer Input Bar */}
        <div className="border-t border-[#1A2438] p-4 bg-[#131B2E]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              maxLength={400}
              aria-label="Inquiry question for AI Advisor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about smog safety, inhaler timing, school..."
              className="sentinel-input flex-1 rounded-lg px-3.5 py-2.5 text-xs text-[#F8FAFC]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#06B6D4] px-4 py-2.5 text-xs font-semibold text-[#090D16] hover:bg-[#38BDF8] transition-colors disabled:opacity-50 whitespace-nowrap min-h-[38px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Ask Advisor</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
