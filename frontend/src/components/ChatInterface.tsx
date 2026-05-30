import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Bot, User, Sparkles, Lightbulb, AlertTriangle, TrendingUp, Target, ChevronDown, ChevronUp, Brain, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/client';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  timestamp: Date;
  isTyping?: boolean;
  isStreaming?: boolean;
}

const QUICK_QUESTIONS = [
  { icon: TrendingUp, label: '处方量趋势', question: '最近处方量怎么样？' },
  { icon: Target, label: '销售目标', question: '销售目标达成情况如何？' },
  { icon: AlertTriangle, label: '合规风险', question: '有哪些合规风险？' },
  { icon: Lightbulb, label: '客户洞察', question: '客户管理有什么建议？' },
];

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const saved = localStorage.getItem('salesclaw_chat_messages');
    const savedThreadId = localStorage.getItem('salesclaw_thread_id');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
        if (parsed.length <= 1) {
          setShowQuickQuestions(true);
        }
      } catch {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是SalesClaw AI助手。我可以帮您分析业务数据、提供决策建议、解答关于医生/医院/产品的问题。请问有什么可以帮助您的？',
          timestamp: new Date(),
        }]);
      }
    } else {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是SalesClaw AI助手。我可以帮您分析业务数据、提供决策建议、解答关于医生/医院/产品的问题。请问有什么可以帮助您的？',
        timestamp: new Date(),
      }]);
    }
    if (savedThreadId) {
      setThreadId(savedThreadId);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('salesclaw_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('salesclaw_thread_id', threadId);
    }
  }, [threadId]);

  const toggleThinking = useCallback((messageId: string) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setShowQuickQuestions(false);

    const streamingMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      thinking: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, streamingMessage]);

    const userId = localStorage.getItem('user_id') || 'admin';

    try {
      await apiClient.chatStream(
        question,
        userId,
        (chunk) => {
          if (chunk.type === 'thinking') {
            setMessages(prev => prev.map(m => 
              m.id === streamingMessage.id 
                ? { ...m, thinking: m.thinking + chunk.content }
                : m
            ));
          } else if (chunk.type === 'answer') {
            setMessages(prev => prev.map(m => 
              m.id === streamingMessage.id 
                ? { ...m, content: m.content + chunk.content }
                : m
            ));
          } else if (chunk.type === 'done') {
            setThreadId(chunk.thread_id);
            setMessages(prev => prev.map(m => 
              m.id === streamingMessage.id 
                ? { ...m, isStreaming: false }
                : m
            ));
          } else if (chunk.type === 'error') {
            console.error('Stream error:', chunk.content);
            setMessages(prev => prev.map(m => 
              m.id === streamingMessage.id 
                ? { 
                    ...m, 
                    content: chunk.content || '抱歉，服务暂时不可用。请稍后再试。',
                    isStreaming: false,
                  }
                : m
            ));
          }
        },
        (error) => {
          console.error('Stream error:', error);
          setMessages(prev => prev.map(m => 
            m.id === streamingMessage.id 
              ? { 
                  ...m, 
                  content: m.content || '抱歉，服务暂时不可用。请稍后再试。',
                  isStreaming: false,
                }
              : m
          ));
        },
        threadId
      );
    } catch (error) {
      setFailedMessages(prev => new Set(prev).add(streamingMessage.id));
      setMessages(prev => prev.map(m => 
        m.id === streamingMessage.id 
          ? { 
              ...m, 
              content: '抱歉，服务暂时不可用。请稍后再试。',
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsSending(false);
      setMessages(prev => {
        const msg = prev.find(m => m.id === streamingMessage.id);
        if (msg && !msg.content && !msg.isStreaming) {
          setFailedMessages(fPrev => new Set(fPrev).add(streamingMessage.id));
        }
        return prev;
      });
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  const handleRetry = async (messageId: string) => {
    setFailedMessages(prev => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex < 0) return;
    let userMsg = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsg = messages[i].content;
        break;
      }
    }
    if (!userMsg) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    const retryStreamingMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      thinking: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, retryStreamingMessage]);
    const userId = localStorage.getItem('user_id') || 'admin';
    setIsSending(true);
    try {
      await apiClient.chatStream(
        userMsg,
        userId,
        (chunk) => {
          if (chunk.type === 'thinking') {
            setMessages(prev => prev.map(m =>
              m.id === retryStreamingMessage.id
                ? { ...m, thinking: m.thinking + chunk.content }
                : m
            ));
          } else if (chunk.type === 'answer') {
            setMessages(prev => prev.map(m =>
              m.id === retryStreamingMessage.id
                ? { ...m, content: m.content + chunk.content }
                : m
            ));
          } else if (chunk.type === 'done') {
            setThreadId(chunk.thread_id);
            setMessages(prev => prev.map(m =>
              m.id === retryStreamingMessage.id
                ? { ...m, isStreaming: false }
                : m
            ));
          } else if (chunk.type === 'error') {
            console.error('Stream error:', chunk.content);
            setFailedMessages(fPrev => new Set(fPrev).add(retryStreamingMessage.id));
            setMessages(prev => prev.map(m =>
              m.id === retryStreamingMessage.id
                ? {
                    ...m,
                    content: chunk.content || '抱歉，服务暂时不可用。请稍后再试。',
                    isStreaming: false,
                  }
                : m
            ));
          }
        },
        (error) => {
          console.error('Stream error:', error);
          setFailedMessages(fPrev => new Set(fPrev).add(retryStreamingMessage.id));
          setMessages(prev => prev.map(m =>
            m.id === retryStreamingMessage.id
              ? {
                  ...m,
                  content: m.content || '抱歉，服务暂时不可用。请稍后再试。',
                  isStreaming: false,
                }
              : m
          ));
        },
        threadId
      );
    } catch (error) {
      setFailedMessages(fPrev => new Set(fPrev).add(retryStreamingMessage.id));
      setMessages(prev => prev.map(m =>
        m.id === retryStreamingMessage.id
          ? {
              ...m,
              content: '抱歉，服务暂时不可用。请稍后再试。',
              isStreaming: false,
            }
          : m
      ));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-white backdrop-blur-xl border-b border-gray-100 p-5 sticky top-0 z-10 shadow-lg shadow-black/5">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-500/15 rounded-xl ring-1 ring-brand-500/20">
            <MessageSquare className="text-brand-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              AI 智能助手
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-500/20">
                在线
              </span>
            </h2>
            <p className="text-xs text-gray-800 mt-0.5">基于实时业务数据的智能问答</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-brand-500 text-white' 
                    : 'bg-gradient-to-br from-brand-500/20 to-purple-500/20 text-brand-400'
                }`}>
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                
                <div className={`rounded-2xl p-3 ${
                  message.role === 'user'
                    ? 'bg-brand-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md shadow-sm'
                }`}>
                  {message.isTyping ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-gray-800 ml-2">思考中...</span>
                    </div>
                  ) : (
                    <>
                      {message.thinking && (
                        <div className="mb-2">
                          <button
                            onClick={() => toggleThinking(message.id)}
                            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            <Brain size={12} />
                            <span>{expandedThinking[message.id] ? '收起' : '展开'}思维过程</span>
                            {expandedThinking[message.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          <AnimatePresence>
                            {expandedThinking[message.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                  <MarkdownRenderer content={message.thinking} className="prose prose-sm max-w-none text-xs text-gray-600 leading-relaxed" />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      {message.content ? (
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      ) : message.isStreaming ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-gray-800 ml-2">思考中...</span>
                        </div>
                      ) : null}
                      <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-700'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                      {!message.isStreaming && failedMessages.has(message.id) && (
                        <button
                          onClick={() => handleRetry(message.id)}
                          className="flex items-center space-x-1 mt-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          <RefreshCw size={12} />
                          <span>重试</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {showQuickQuestions && messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles size={14} className="text-brand-400" />
            <span className="text-xs font-medium text-gray-800">快捷问题</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickQuestion(q.question)}
                className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-brand-500/30 hover:bg-brand-500/5 transition-colors text-xs text-gray-600"
              >
                <q.icon size={14} className="text-brand-400" />
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="输入您的问题，如：张主任最近怎么样？"
            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 text-sm"
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className={`p-3 rounded-xl transition-colors ${
              inputValue.trim() && !isSending
                ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/30'
                : 'bg-gray-100 text-gray-700 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
