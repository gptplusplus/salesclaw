
import React, { ReactNode, useState, useEffect } from 'react';
import { LayoutDashboard, Activity, Settings, Bell, Network, X, CheckCircle, AlertTriangle, Info, Lightbulb, MessageSquare, LogOut, HelpCircle, ChevronDown, Sparkles, Brain, Target, Wrench } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useOntologyContext } from '../contexts/OntologyContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocketChat } from '../api/hooks';
import GlobalSearch from './GlobalSearch';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNavigateToOntology?: (objectId: string) => void;
  onShowHelp?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onNavigateToOntology, onShowHelp }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { state, getUnreadNotifications, markNotificationRead, dismissSuggestion, dismissReminder } = useOntologyContext();
  const { user, logout } = useAuth();
  const wsChat = useWebSocketChat(user?.id || 'default_user');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  useEffect(() => {
    wsChat.connect();
    return () => wsChat.disconnect();
  }, []);

  useEffect(() => {
    const wsMessages = wsChat.messages || [];
    const lastMessage = wsMessages[wsMessages.length - 1];
    if (!lastMessage) return;
    if (lastMessage.type === 'new_alert') {
      const toastId = `toast_${Date.now()}`;
      setToasts(prev => [...prev, { id: toastId, message: lastMessage.message || '新告警', type: 'alert' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 4000);
    } else if (lastMessage.type === 'action_status_change') {
      const toastId = `toast_${Date.now()}`;
      setToasts(prev => [...prev, { id: toastId, message: lastMessage.message || '动作状态变更', type: 'action' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 4000);
    } else if (lastMessage.type === 'reminder_update') {
      const toastId = `toast_${Date.now()}`;
      setToasts(prev => [...prev, { id: toastId, message: lastMessage.message || '提醒更新', type: 'reminder' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 4000);
    }
  }, [wsChat.messages]);

  const unreadNotifications = getUnreadNotifications();
  const notificationCount = unreadNotifications.length + state.cognitive.suggestions.length + state.cognitive.reminders.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'risk_alert': return <AlertTriangle size={14} className="text-alert-500" />;
      case 'compliance_warning': return <AlertTriangle size={14} className="text-warning-500" />;
      case 'action_approved': return <CheckCircle size={14} className="text-compliance-500" />;
      default: return <Info size={14} className="text-medical-500" />;
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'risk_alert': return <AlertTriangle size={14} className="text-alert-500" />;
      case 'opportunity': return <Lightbulb size={14} className="text-warning-500" />;
      case 'churn_warning': return <AlertTriangle size={14} className="text-alert-400" />;
      default: return <Lightbulb size={14} className="text-medical-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-surface-50 text-slate-800 overflow-hidden font-sans antialiased selection:bg-medical-200 selection:text-medical-900 relative">
      <aside className="w-16 md:w-72 bg-white border-r border-slate-200/60 flex flex-col z-20 shadow-medical relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-medical-100/40 to-health-100/20 blur-3xl -z-10" />

        <div className="p-4 md:p-5 flex items-center justify-center md:justify-start space-x-3 border-b border-slate-100 h-16 md:h-16 bg-gradient-to-r from-medical-50/40 to-transparent">
          <div className="w-9 h-9 bg-gradient-to-br from-medical-500 to-medical-600 rounded-lg flex items-center justify-center shadow-glow ring-2 ring-medical-200">
            <Activity size={18} className="text-white" />
          </div>
          <span className="hidden md:block font-display font-bold text-xl tracking-tight text-slate-900">SalesClaw</span>
        </div>

        <nav className="flex-1 py-6 space-y-1 px-3 md:px-4 relative z-10">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="工作台"
            active={activeTab === 'workspace'}
            onClick={() => onTabChange('workspace')}
          />
          <NavItem
            icon={<Network size={18} />}
            label="知识图谱"
            active={activeTab === 'ontology'}
            onClick={() => onTabChange('ontology')}
          />

          <div className="flex items-center gap-2 px-3 md:px-3.5 py-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">数据</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <NavItem
            icon={<Sparkles size={18} />}
            label="智能洞察"
            active={activeTab === 'insights'}
            onClick={() => onTabChange('insights')}
          />
          <NavItem
            icon={<Brain size={18} />}
            label="推理规则"
            active={activeTab === 'rules'}
            onClick={() => onTabChange('rules')}
          />

          <div className="flex items-center gap-2 px-3 md:px-3.5 py-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">行动</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <NavItem
            icon={<Target size={18} />}
            label="场景推演"
            active={activeTab === 'scenario'}
            onClick={() => onTabChange('scenario')}
          />
          <NavItem
            icon={<MessageSquare size={18} />}
            label="AI 助手"
            active={activeTab === 'chat'}
            onClick={() => onTabChange('chat')}
          />
          <NavItem
            icon={<Wrench size={18} />}
            label="AI 工具箱"
            active={activeTab === 'tools'}
            onClick={() => onTabChange('tools')}
          />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-gradient-to-t from-slate-50/80 to-transparent">
          <NavItem icon={<HelpCircle size={18} />} label="帮助" onClick={onShowHelp} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] opacity-15 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, rgba(12, 135, 235, 0.08) 0%, transparent 60%)',
              animation: 'ambientPulse 12s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] opacity-10 blur-[100px]"
            style={{
              background: 'radial-gradient(circle, rgba(12, 193, 126, 0.06) 0%, transparent 60%)',
              animation: 'ambientPulse 16s ease-in-out infinite 4s'
            }}
          />
        </div>
        <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10 shadow-medical">
          <div className="flex items-center text-slate-600 text-sm font-medium">
            <span className="mr-3 hover:text-slate-800 transition-colors cursor-pointer">Workspaces</span> 
            <span className="text-slate-600">/</span> 
            <span className="ml-3 text-slate-800 px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200 text-xs font-medium">2026年销售战略</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:block">
              <GlobalSearch onSelectObject={(obj) => {
                onNavigateToOntology?.(obj.id);
                onTabChange('ontology');
              }} />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 text-slate-600 hover:text-medical-600 hover:bg-medical-50 rounded-lg transition-all duration-200"
              >
                <Bell size={19} />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-alert-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-10 w-80 md:w-96 bg-white rounded-xl shadow-medical-lg border border-slate-200/60 overflow-hidden z-50"
                  >
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 text-sm">通知中心</h3>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-slate-600 hover:text-slate-800"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {state.cognitive.suggestions.length > 0 && (
                        <div className="p-2">
                          <div className="text-xs font-medium text-slate-600 px-2 py-1">智能建议</div>
                          {state.cognitive.suggestions.slice(0, 3).map((suggestion) => (
                            <div 
                              key={suggestion.id}
                              className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group"
                            >
                              <div className="flex items-start gap-2">
                                {getSuggestionIcon(suggestion.type)}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-800">{suggestion.title}</div>
                                  <div className="text-xs text-slate-600 truncate">{suggestion.description}</div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissSuggestion(suggestion.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-800"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {state.cognitive.reminders.length > 0 && (
                        <div className="p-2 border-t border-slate-100">
                          <div className="text-xs font-medium text-slate-600 px-2 py-1">待办提醒</div>
                          {state.cognitive.reminders.slice(0, 3).map((reminder) => (
                            <div 
                              key={reminder.id}
                              className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group"
                            >
                              <div className="flex items-start gap-2">
                                <CheckCircle size={13} className="text-medical-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-800">{reminder.title}</div>
                                  <div className="text-xs text-slate-600">{reminder.description}</div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissReminder(reminder.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-800"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {unreadNotifications.length > 0 && (
                        <div className="p-2 border-t border-slate-100">
                          <div className="text-xs font-medium text-slate-600 px-2 py-1">系统通知</div>
                          {unreadNotifications.slice(0, 5).map((notification) => (
                            <div 
                              key={notification.id}
                              onClick={() => markNotificationRead(notification.id)}
                              className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                {getNotificationIcon(notification.type)}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-800">{notification.title}</div>
                                  <div className="text-xs text-slate-600 truncate">{notification.message}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {notificationCount === 0 && (
                        <div className="p-6 text-center text-slate-600">
                          <Bell size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">暂无新通知</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <span className="text-xs font-medium text-slate-600">{user?.displayName || '管理员'}</span>
                <ChevronDown size={12} className="text-slate-400" />
              </button>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-8 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden"
                  >
                    <button
                      onClick={() => { setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Settings size={14} />
                      <span>系统设置</span>
                    </button>
                    <div className="border-t border-slate-100" />
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>退出登录</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 md:p-6 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>

      {/* Toast 通知叠加层 */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`pointer-events-auto max-w-sm px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm flex items-center gap-3 ${
                toast.type === 'alert'
                  ? 'bg-white/80 border-rose-200 text-rose-700'
                  : toast.type === 'action'
                  ? 'bg-white/80 border-brand-200 text-brand-400'
                  : 'bg-white/80 border-white0/20 text-emerald-400'
              }`}
            >
              {toast.type === 'alert' ? (
                <AlertTriangle size={18} className="text-rose-700 flex-shrink-0" />
              ) : toast.type === 'action' ? (
                <CheckCircle size={18} className="text-brand-400 flex-shrink-0" />
              ) : (
                <Lightbulb size={18} className="text-emerald-400 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, badge, onClick }: { icon: ReactNode, label: string, active?: boolean, badge?: string, onClick?: () => void }) => (
  <button onClick={onClick} className={clsx(
    "w-full flex items-center space-x-2.5 px-3 md:px-3.5 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
    active 
      ? "bg-medical-50 text-medical-700 shadow-sm ring-1 ring-medical-200" 
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
  )}>
    {active && (
      <div className="absolute inset-0 bg-gradient-to-r from-medical-100/40 to-transparent opacity-50" />
    )}
    <span className={clsx("transition-all duration-200 relative z-10", active ? "text-medical-600" : "text-slate-600 group-hover:text-slate-800")}>
      {icon}
    </span>
    <span className={clsx("hidden md:block text-base flex-1 text-left tracking-wide relative z-10", active ? "font-bold" : "font-semibold")}>{label}</span>
    {badge && (
      <span className="hidden md:flex bg-alert-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.1rem] items-center justify-center shadow-sm">
        {badge}
      </span>
    )}
  </button>
);

export default Layout;