import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  X,
  Bot,
  User,
  CheckCircle,
  Loader2,
  MessageSquare,
  AlertCircle,
  Settings
} from 'lucide-react';

interface AiAssistantProps {
  onRefreshState: () => Promise<void>;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isHelpfulAlert?: boolean;
}

export function AiAssistant({ onRefreshState }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('KOPACI_USER_GEMINI_API_KEY') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Përshëndetje! Unë jam Asistenti Inteligjent AI i Auto Servis Kopaçi. 🛠️\n\nMund të më flisni ose shkruani në shqip për të menaxhuar aplikacionin. Për shembull:\n• "Shto artikull të ri me kodin V-10, emrin Filtër BMW, kategoria Filtra, sasia 8, blerja 10, shitja 18"\n• "Regjistro një dalje prej 2 copash për artikullin me kod VAJ-5W30 për klientin Albert"\n• "Krijo një porosi për furnitorin Autopasion me total 300 euro"\n• "Regjistro një pagesë 150 euro për Intercars"\n\nShtypni butonin e mikrofonit për të më folur me zë!'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  // Handle Speech Recognition Init
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'sq-AL';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          // Auto send after speech
          handleSendMessage(transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [isVoiceEnabled]);

  // Speak Output Text
  const speakText = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Clean emojis and symbols for smoother TTS speech
      const cleanText = text.replace(/[•\-*#_💻🛠️📊⚙️✅💼🚙⭐🔋⛽🧴]/g, ' ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'sq-AL';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Text-to-speech error:', e);
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      alert('Dëgjimi me zë nuk mbështetet në këtë shfletues. Ju lutemi përdorni Google Chrome ose Microsoft Edge.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      setApiKeyError(false);
      recognition.start();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputText).trim();
    if (!messageText) return;

    if (!textToSend) {
      setInputText('');
    }

    // Append user message
    const userMessage: ChatMessage = { role: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setApiKeyError(false);

    try {
      // Build API History for server: match the API Content/Parts model
      // Format roles of history properly: 'user' and 'model'
      const apiHistory = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: apiHistory,
          userApiKey: userApiKey.trim() || undefined
        })
      });

      if (!res.ok) {
        let errMsg = 'Gabim i panjohur nga serveri.';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await res.json();
            if (errData.status === 'key_missing') {
              setApiKeyError(true);
              setMessages(prev => [...prev, {
                role: 'model',
                text: '⚠️ Çelësi i API-it të Gemini mungon. Ju lutemi klikoni butonin me ikonën e cilësimeve (⚙️) sipër në fushën e asistentit për të vendosur çelësin tuaj personal të API-it, ose shtojeni atë në mjedisin e Render me emrin "GEMINI_API_KEY".',
                isHelpfulAlert: true
              }]);
              setIsProcessing(false);
              return;
            }
            errMsg = errData.error || errData.message || errMsg;
          } else {
            const textData = await res.text();
            errMsg = textData.substring(0, 200) || `Serveri ktheu statusin ${res.status}`;
          }
        } catch (e) {
          errMsg = `Gabim gjatë leximit të përgjigjes së serverit (Statusi: ${res.status})`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      // Append AI response
      const aiResponseText = data.message;
      setMessages(prev => [...prev, { role: 'model', text: aiResponseText }]);

      // Speak if enabled
      if (isVoiceEnabled) {
        speakText(aiResponseText);
      }

      // Check if databases were modified by AI, trigger reactive state reload!
      if (data.refreshNeeded) {
        await onRefreshState();
      }
    } catch (err: any) {
      console.error('Error talking to AI:', err);
      const readableError = err.message || String(err);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `❌ Ndodhi një gabim gjatë komunikimit me serverin AI.\n\nDetajet e gabimit:\n"${readableError}"\n\nJu lutemi sigurohuni që jeni lidhur me internetin, apo keni vendosur një Gemini API Key të vlefshëm tek ikona ⚙️.`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="ai-assistant-root" className="font-sans">
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-6 right-6 z-40">
            <motion.button
              id="ai-bubble-toggle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="cursor-pointer bg-slate-900 border border-slate-800 text-amber-500 p-4 rounded-full shadow-2xl flex items-center justify-center gap-2.5 relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <Sparkles className="w-6 h-6 animate-pulse" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out text-sm font-black uppercase tracking-wider text-white">
                Siri i Kopaçit
              </span>
              <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-slate-900 uppercase">
                AI
              </div>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] z-50">
            <motion.div
              id="ai-assistant-modal"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full h-[82vh] sm:h-[550px] bg-white rounded-t-3xl sm:rounded-2xl shadow-3xl border-t sm:border border-slate-250 overflow-hidden flex flex-col relative"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 relative">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-slate-900 via-amber-500 to-slate-800"></div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-amber-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                      Asistenti AI <span className="text-amber-500 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">KOPAÇI</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Auto-Menaxhim &amp; Kontroll me Zë</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Settings Toggle Button */}
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    title="Cilësimet e API Key"
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      showSettings
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold'
                        : 'bg-slate-800 border-slate-755 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {/* Voice Output Toggle Button */}
                  <button
                    onClick={() => {
                      const nextVal = !isVoiceEnabled;
                      setIsVoiceEnabled(nextVal);
                      if (!nextVal && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    title={isVoiceEnabled ? "Çaktivizo leximin me zë" : "Aktivizo leximin me zë (Shqip)"}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isVoiceEnabled
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : 'bg-slate-800 border-slate-755 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-755 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-900 border-b border-slate-800 text-white p-4 space-y-3 relative overflow-hidden shrink-0 z-10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-amber-500" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-100">Cilësimet e Gemini API Key</span>
                      </div>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-mono">
                        Secured
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Shtoni çelësin tuaj personal të API-së nga Google AI Studio. Ai ruhet lokalisht në shfletuesin tuaj për të bërë bisedat funksionale. Enkriptuar në nivel klienti.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={userApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUserApiKey(val);
                          localStorage.setItem('KOPACI_USER_GEMINI_API_KEY', val);
                        }}
                        placeholder="Vendosni çelësin API këtu (e.g. AIzaSy...)"
                        className="flex-1 bg-slate-950/80 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono transition-all"
                      />
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          setMessages(prev => [...prev, {
                            role: 'model',
                            text: userApiKey.trim()
                              ? '🔑 Çelësi i API-it të Gemini u përditësua me sukses! Tani mund të përdorni asistentin lirshëm.'
                              : 'ℹ️ Çelësi i API-it të Gemini u fshi. Tashmë do të përdoret çelësi standard i sistemit.'
                          }]);
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer border border-amber-600 active:scale-95"
                      >
                        Ruaj
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Messages Panel */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                {messages.map((msg, index) => {
                  const isModel = msg.role === 'model';
                  return (
                    <div
                      key={index}
                      className={`flex gap-2.5 ${isModel ? 'justify-start' : 'justify-end'}`}
                    >
                      {isModel && (
                        <div className="w-7 h-7 bg-slate-900 text-amber-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-800 text-[10px] font-bold">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed font-sans shadow-sm border ${
                          isModel
                            ? msg.isHelpfulAlert
                              ? 'bg-amber-50 border-amber-200 text-amber-950'
                              : 'bg-white border-slate-200 text-slate-800 font-medium'
                            : 'bg-slate-900 border-slate-850 text-white rounded-tr-none'
                        }`}
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {msg.text}
                      </div>
                      {!isModel && (
                        <div className="w-7 h-7 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center shrink-0 border border-amber-400 text-[10px] font-bold">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isProcessing && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-7 h-7 bg-slate-900 text-amber-500 rounded-lg flex items-center justify-center shrink-0 border border-slate-800">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      <span>Duke analizuar dhe ekzekutuar komandën...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Warning if Gemini Key is absent */}
              {apiKeyError && (
                <div className="px-4 py-2 bg-amber-50 border-t border-b border-amber-200 flex items-start gap-2 text-[11px] text-amber-800 leading-normal">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Konfigurimi i Çelësit:</span> Hapni menunë e dhomës në krye të djathtë dhe shtoni <code>GEMINI_API_KEY</code> me kodin tuaj personal të Google AI Studio.
                  </div>
                </div>
              )}

              {/* Microphone Active Wavebar */}
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 40 }}
                    exit={{ height: 0 }}
                    className="bg-rose-50 border-t border-rose-100 flex items-center justify-center gap-2 text-rose-700 text-xs overflow-hidden"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                    <span className="font-bold uppercase tracking-wider text-[10px]">Po ju dëgjoj... Flisni tani në Shqip</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative shrink-0 ${
                    isListening
                      ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                  }`}
                  title={isListening ? "Ndalo dëgjimin me zë" : "Flisni me zë (Shqip)"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 w-2.5 h-2.5 rounded-full animate-ping"></span>
                  )}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  disabled={isProcessing}
                  placeholder={isListening ? "Po dëgjoj..." : "Shkruani komandën..."}
                  className="flex-1 min-w-0 bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !inputText.trim()}
                  className="p-2.5 bg-slate-900 border border-slate-800 text-amber-500 hover:text-amber-400 rounded-xl hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
