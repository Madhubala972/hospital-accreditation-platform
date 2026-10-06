import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { copilotApi } from '../services/api';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  Info,
  Clock,
  ChevronRight,
  Code
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'Why is ICU risk high?',
  'What clinical evidence shows skipped medication verification in ICU?',
  'What is the status of our Emergency department waiting times?',
  'Explain Surgery department accreditation conformance.',
  'Summarize recent high-severity quality alerts.'
];

export default function AICopilot() {
  const { selectedDepartment } = useApp();
  const targetDept = selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU';

  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello! I am your **Hospital Quality & Accreditation Copilot**.\n\nI can explain calculated risk factors, clinical protocol deviations from PM4Py process mining, and audit evidence for **${targetDept}** or hospital-wide units without hallucinating numerical scores.\n\nHow can I assist your quality team today?`,
      timestamp: new Date(),
      source: 'System Intelligence'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(null);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText = inputText) => {
    const query = queryText.trim();
    if (!query || loading) return;

    const userMessage = {
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const res = await copilotApi.ask(targetDept, query);
      const copilotData = res.data.data;

      const aiMessage = {
        sender: 'ai',
        text: copilotData.explanation,
        timestamp: new Date(),
        source: copilotData.source,
        usedContext: copilotData.usedContext
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `⚠️ **Service Communication Issue**: Unable to generate explanation. ${err.response?.data?.message || err.message}`,
          timestamp: new Date(),
          source: 'Error Handler'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">AI Quality & Accreditation Copilot</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    EVIDENCE-BACKED EXPLAINER
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Natural language quality intelligence grounded exclusively on stored metrics, process mining deviations, and accreditation evidence.
                </p>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-[11px] font-medium">Strict Rule: Explains existing scores; never invents numerical risk.</span>
          </div>
        </div>
      </div>

      {/* Suggested Questions Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Quick Prompts:
        </span>
        {SUGGESTED_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium border border-slate-200 whitespace-nowrap transition flex items-center gap-1 shadow-sm"
          >
            <span>{q}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        ))}
      </div>

      {/* Chat Conversation Card */}
      <div className="bg-white border border-sky-100 rounded-2xl flex flex-col h-[520px] overflow-hidden shadow-sm">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-tr from-indigo-600 to-violet-600'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <BotMessageSquare className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs space-y-2 leading-relaxed shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                <div className="prose prose-xs max-w-none whitespace-pre-wrap">
                  {m.text}
                </div>

                <div className={`flex items-center justify-between pt-1 border-t text-[10px] ${
                  m.sender === 'user' ? 'border-blue-500 text-blue-100' : 'border-slate-200 text-slate-500'
                }`}>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.source && <span className="font-mono font-medium">{m.source}</span>}
                </div>

                {/* Minimal Context Inspector (Section 14 transparency) */}
                {m.usedContext && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowContextDetails(showContextDetails === idx ? null : idx)}
                      className="flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-800 font-mono font-semibold"
                    >
                      <Code className="w-3 h-3" />
                      <span>{showContextDetails === idx ? 'Hide Audit Context' : 'Inspect Stored Context Sent to AI'}</span>
                    </button>
                    {showContextDetails === idx && (
                      <pre className="mt-2 p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-800 overflow-x-auto max-h-40">
                        {JSON.stringify(m.usedContext, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-md">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                <BotMessageSquare className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Gathering stored department metrics & evidence...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3"
        >
          <input
            type="text"
            placeholder={`Ask a question about ${targetDept} risk, deviations, or accreditation evidence...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
