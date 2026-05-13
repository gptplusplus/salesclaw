import React, { useState, useEffect } from 'react';
import { useOntologyContext } from '../contexts/OntologyContext';
import { AlertTriangle, TrendingUp, Inbox, ChevronRight, XCircle, Sparkles, Network, Eye, Zap, Brain, BarChart2, Clock, CheckCircle, XOctagon, FileText, User, Calendar, Target, ArrowRight, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReasoningEngineStatus from './ReasoningEngineStatus';
import EntityPerceptionPanel from './EntityPerceptionPanel';
import ProactiveSuggestionPanel from './ProactiveSuggestionPanel';
import AgentStatusPanel from './AgentStatusPanel';
import SmartReminderPanel from './SmartReminderPanel';
import DecisionEffectFeedback from './DecisionEffectFeedback';
import { DecisionExecution, ExecutionStatus } from '../decision/DecisionOntology';
import { ActionProposal } from '../types';

const DecisionOverview: React.FC = () => {
  const { state, getPendingActions, getUnreadNotifications, approveAction, rejectAction } = useOntologyContext();
  const pendingActions = getPendingActions();
  const unreadNotifications = getUnreadNotifications();

  // Mock data for testing interactions
  const mockPendingActions: ActionProposal[] = pendingActions.length > 0 ? pendingActions : [
    {
      id: 'mock-action-1',
      title: '调整医生王建国处方建议',
      description: '根据最近的销售数据和市场趋势，AI建议调整王建国的处方建议，增加新产品A的推荐比例。预计可提升该区域销售额15%。',
      type: 'adjustment',
      entityId: 'doctor-1',
      entityName: '王建国医生',
      entityType: 'Doctor' as any,
      priority: 'high',
      confidence: 0.85,
      reasoningChain: {
        conclusion: '建议增加产品A的推荐比例',
        evidence: [
          { type: 'data', source: '销售系统', content: '王建国医生过去3个月的产品B处方量下降20%', confidence: 0.9 },
          { type: 'analysis', source: '市场分析', content: '新产品A在同类医生群体中接受度达78%', confidence: 0.85 },
        ] as any,
        confidence: 0.85,
        alternativeHypotheses: [
          { hypothesis: '医生对现有产品不满意', confidence: 0.6 },
          { hypothesis: '竞品正在进行促销活动', confidence: 0.4 },
        ],
        suggestedActions: [
          { action: '调整处方建议', priority: 'high', expectedImpact: '提升销售额15%' },
        ] as any,
      },
      actionDefinition: {} as any,
      status: 'pending',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'mock-action-2',
      title: '李红梅医生拜访计划优化',
      description: '基于李红梅医生的处方行为分析，建议将月度拜访频率从2次调整为3次，并增加学术支持内容。',
      type: 'visit_plan',
      entityId: 'doctor-2',
      entityName: '李红梅医生',
      entityType: 'Doctor' as any,
      priority: 'medium',
      confidence: 0.72,
      reasoningChain: {
        conclusion: '建议增加拜访频率和学术支持',
        evidence: [
          { type: 'data', source: 'CRM系统', content: '李红梅医生是高潜力客户，当前处方量未达预期', confidence: 0.8 },
          { type: 'feedback', source: '代表反馈', content: '该医生对学术内容反馈积极', confidence: 0.75 },
        ] as any,
        confidence: 0.72,
        alternativeHypotheses: [
          { hypothesis: '医生需要更多产品信息', confidence: 0.5 },
        ],
        suggestedActions: [
          { action: '增加拜访频率', priority: 'medium', expectedImpact: '提升处方量20%' },
        ] as any,
      },
      actionDefinition: {} as any,
      status: 'pending',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const criticalAlerts = unreadNotifications.length > 0 
    ? unreadNotifications.filter(n => n.priority === 'high')
    : [
        {
          id: 'mock-alert-1',
          title: '区域销售异常波动',
          message: '华东区域本周销售额较上周下降18%，超出正常波动范围。AI检测到3位核心医生处方行为发生显著变化。',
          priority: 'high' as const,
          type: 'alert',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ];

  const [activeTab, setActiveTab] = useState<'decisions' | 'risks' | 'insights' | 'ai'>('decisions');
  const [showEffectModal, setShowEffectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionProposal | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<typeof criticalAlerts[0] | null>(null);
  const [effectExecutions, setEffectExecutions] = useState<DecisionExecution[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [showPerceptionPanel, setShowPerceptionPanel] = useState(true);
  const [showSuggestionPanel, setShowSuggestionPanel] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateAiSummary();
    }, 500);
    return () => clearTimeout(timer);
  }, [mockPendingActions, criticalAlerts]);

  const generateAiSummary = async () => {
    try {
      const { default: apiClient } = await import('../api/client');
      const data = await apiClient.request<{summary?: string}>('/api/suggestions/summary');
      if (data && data.summary) {
        setAiSummary(data.summary);
      } else {
        setAiSummary('今日系统运行正常，无待决策事项。AI 持续监控中，发现异常将立即通知您。');
      }
    } catch {
      const parts = [];
      if (mockPendingActions.length > 0) {
        parts.push(`今日有 ${mockPendingActions.length} 项待决策事项需要处理`);
      }
      if (criticalAlerts.length > 0) {
        parts.push(`${criticalAlerts.length} 条高风险预警需要关注`);
      }
      const doctors = state.objects.filter(o => o.objectType === 'Doctor');
      const decliningDoctors = doctors.filter(d => d.status === 'warning' || d.status === 'critical');
      if (decliningDoctors.length > 0) {
        parts.push(`${decliningDoctors.length} 位医生状态异常（${decliningDoctors.map(d => d.name).slice(0, 2).join('、')}）`);
      }
      if (parts.length === 0) {
        setAiSummary('今日系统运行正常，无待决策事项。AI 持续监控中，发现异常将立即通知您。');
      } else {
        setAiSummary(parts.join('；') + '。');
      }
    }
    setSummaryLoading(false);
  };

  const handleViewEffect = async () => {
    try {
      const { default: apiClient } = await import('../api/client');
      const logs = await apiClient.request<any[]>('/api/actions/execution-logs?limit=20');
      if (logs && logs.length > 0) {
        const executions: DecisionExecution[] = logs.map((log: any) => ({
          id: log.id,
          decisionId: log.plan_id || log.id,
          recommendationId: '',
          status: log.status === 'executed' ? ExecutionStatus.COMPLETED : ExecutionStatus.IN_PROGRESS,
          executor: log.user_id || 'AI Agent',
          executedAt: log.timestamp || new Date().toISOString(),
          progress: { overall: log.status === 'executed' ? 100 : 50, byAction: {}, estimatedCompletion: '' },
          actions: [],
          issues: [],
        }));
        setEffectExecutions(executions);
      } else {
        setEffectExecutions([]);
      }
      setShowEffectModal(true);
    } catch {
      setEffectExecutions([]);
      setShowEffectModal(true);
    }
  };

  const handleViewDetail = (action: ActionProposal) => {
    setSelectedAction(action);
    setShowDetailModal(true);
  };

  const handleViewAlertDetail = (alert: typeof criticalAlerts[0]) => {
    setSelectedAlert(alert);
    setShowAlertModal(true);
  };

  const handleApprove = async (actionId: string) => {
    try {
      await approveAction(actionId);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to approve action:', error);
    }
  };

  const handleReject = async (actionId: string) => {
    try {
      await rejectAction(actionId);
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to reject action:', error);
    }
  };

  const opportunityCount = state.objects.filter(obj => 
    obj.objectType === 'Doctor' && obj.lifecycleStage === 'prospect'
  ).length;

  const tabs = [
    { id: 'decisions' as const, label: '待决策', icon: Inbox, badge: mockPendingActions.length },
    { id: 'risks' as const, label: '风险预警', icon: AlertTriangle, badge: criticalAlerts.length },
    { id: 'insights' as const, label: '机会洞察', icon: Lightbulb, badge: opportunityCount },
    { id: 'ai' as const, label: 'AI 工具', icon: Brain, badge: null },
  ];

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto w-full px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Sparkles className="mr-2 text-brand-400" size={24} />
            决策中枢
          </h2>
          <p className="text-gray-800 text-sm mt-1">AI驱动的智能决策支持</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 text-emerald-400 rounded-full border border-emerald-500/25 shadow-glow-green">
          <span className="w-2 h-2 rounded-full bg-white0 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span>实时分析中</span>
        </div>
      </div>

      {/* AI Summary */}
      <AnimatePresence>
        {summaryLoading ? (
          <motion.div
            key="summary-loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-brand-500/5 via-purple-500/5 to-brand-500/5 rounded-2xl border border-brand-500/10 overflow-hidden mb-4"
          >
            <div className="p-4 flex items-center space-x-3">
              <div className="animate-spin w-5 h-5 border-2 border-brand-500/20 border-t-brand-500 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="summary-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gradient-to-r from-brand-500/5 via-purple-500/5 to-brand-500/5 rounded-2xl border border-brand-500/10 overflow-hidden mb-4"
          >
            <div className="p-5">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-brand-500/10 rounded-xl ring-1 ring-brand-500/20 flex-shrink-0">
                  <Sparkles className="text-brand-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-700">今日决策摘要</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">AI 生成</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{aiSummary}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-50 p-1 rounded-xl mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === tab.id 
                ? 'bg-white shadow-sm text-brand-400 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            <span className="text-sm">{tab.label}</span>
            {tab.badge !== null && tab.badge > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={handleViewEffect}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-all"
        >
          <BarChart2 size={16} />
          <span className="text-sm">效果追踪</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'decisions' && (
            <motion.div
              key="decisions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center space-x-2">
                  <Inbox className="text-brand-400" size={18} />
                  <span>待决策事项</span>
                  {mockPendingActions.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400">
                      {mockPendingActions.length}
                    </span>
                  )}
                </h3>
                {mockPendingActions.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-800">暂无待决策事项</p>
                    <p className="text-sm text-gray-500 mt-1">AI 会持续监控并生成建议</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockPendingActions.map(action => (
                      <div 
                        key={action.id} 
                        className="p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-brand-500/20 group"
                        onClick={() => handleViewDetail(action)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700 mb-1">{action.title}</div>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 ml-2">待审批</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Target size={12} className="mr-1" />
                              {action.entityName}
                            </span>
                            <span className="flex items-center">
                              <Clock size={12} className="mr-1" />
                              {new Date(action.timestamp).toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <CheckCircle size={12} className="mr-1" />
                              置信度 {action.confidence != null ? (action.confidence * 100).toFixed(0) : '--'}%
                            </span>
                          </div>
                          <span className="text-xs text-brand-400 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            查看详情
                            <ArrowRight size={12} className="ml-1" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'risks' && (
            <motion.div
              key="risks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center space-x-2">
                  <AlertTriangle className="text-orange-700" size={18} />
                  <span>风险预警</span>
                  {criticalAlerts.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {criticalAlerts.length}
                    </span>
                  )}
                </h3>
                {criticalAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto text-emerald-300 mb-3" />
                    <p className="text-gray-800">暂无高风险预警</p>
                    <p className="text-sm text-gray-500 mt-1">系统运行正常，持续监控中</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {criticalAlerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className="p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 transition-all group"
                        onClick={() => handleViewAlertDetail(alert)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-700 flex items-center space-x-2">
                            <AlertTriangle size={16} className="text-orange-700" />
                            <span>{alert.title}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">高优先级</span>
                        </div>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-orange-600">
                            {new Date(alert.timestamp).toLocaleString('zh-CN')}
                          </span>
                          <span className="text-xs text-brand-400 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            查看详情
                            <ArrowRight size={12} className="ml-1" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Eye className="text-purple-400" size={18} />
                      <h3 className="font-bold text-gray-700">实体感知</h3>
                    </div>
                    <button
                      onClick={() => setShowPerceptionPanel(!showPerceptionPanel)}
                      className="text-xs text-gray-800 hover:text-gray-600 flex items-center"
                    >
                      {showPerceptionPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showPerceptionPanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <EntityPerceptionPanel 
                          entities={state.objects}
                          maxDisplay={5}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="text-orange-700" size={18} />
                      <h3 className="font-bold text-gray-700">主动建议</h3>
                    </div>
                    <button
                      onClick={() => setShowSuggestionPanel(!showSuggestionPanel)}
                      className="text-xs text-gray-800 hover:text-gray-600 flex items-center"
                    >
                      {showSuggestionPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showSuggestionPanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <ProactiveSuggestionPanel 
                          entities={state.objects}
                          maxDisplay={5}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center space-x-2">
                  <Network className="text-emerald-400" size={18} />
                  <span>机会洞察</span>
                </h3>
                <div className="text-center py-12">
                  <TrendingUp size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-800">正在分析市场机会...</p>
                  <p className="text-sm text-gray-500 mt-1">AI 会根据实体状态和市场数据生成洞察</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <ReasoningEngineStatus />
              <SmartReminderPanel />
              <AgentStatusPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-100/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/5" />
                <div className="relative p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-brand-500/10 rounded-xl border border-brand-500/20">
                        <FileText className="text-brand-400" size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-700">{selectedAction.title}</h2>
                        <p className="text-sm text-gray-800 mt-0.5">决策详情与审批</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <XCircle size={22} className="text-gray-800 hover:text-gray-800" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <FileText size={16} className="mr-2 text-brand-400" />
                    决策描述
                  </h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl leading-relaxed">
                    {selectedAction.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <User size={16} className="text-gray-800" />
                      <span className="text-xs font-bold text-gray-700">关联实体</span>
                    </div>
                    <div className="text-sm text-gray-600">{selectedAction.entityName}</div>
                    <div className="text-xs text-gray-500 mt-1">{selectedAction.entityType}</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className="text-gray-800" />
                      <span className="text-xs font-bold text-gray-700">创建时间</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedAction.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target size={16} className="text-gray-800" />
                      <span className="text-xs font-bold text-gray-700">优先级</span>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded-full font-bold ${
                      selectedAction.priority === 'high' 
                        ? 'bg-rose-100 text-rose-800' 
                        : selectedAction.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedAction.priority === 'high' ? '高' : selectedAction.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle size={16} className="text-gray-800" />
                      <span className="text-xs font-bold text-gray-700">置信度</span>
                    </div>
                    <div className="text-2xl font-bold text-brand-400">
                      {selectedAction.confidence != null ? (selectedAction.confidence * 100).toFixed(0) : '--'}%
                    </div>
                  </div>
                </div>

                {selectedAction.reasoningChain && selectedAction.reasoningChain.evidence && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                      <Brain size={16} className="mr-2 text-purple-400" />
                      AI 推理依据
                    </h3>
                    <div className="mb-3 p-3 bg-brand-50 rounded-xl">
                      <div className="text-sm font-medium text-gray-700 mb-1">结论</div>
                      <div className="text-sm text-gray-600">{selectedAction.reasoningChain.conclusion}</div>
                    </div>
                    <div className="space-y-2">
                      {selectedAction.reasoningChain.evidence.map((item: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-brand-400">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700">{item.content}</div>
                            <div className="text-xs text-gray-500 mt-1">来源: {item.source} | 置信度: {item.confidence != null ? (item.confidence * 100).toFixed(0) : '--'}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedAction.reasoningChain.alternativeHypotheses && selectedAction.reasoningChain.alternativeHypotheses.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-bold text-gray-700 mb-2">其他假设</h4>
                        <div className="space-y-1">
                          {selectedAction.reasoningChain.alternativeHypotheses.map((h: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">{h.hypothesis}</span>
                              <span className="text-gray-500">{h.confidence != null ? (h.confidence * 100).toFixed(0) : '--'}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleReject(selectedAction.id)}
                    className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center space-x-2"
                  >
                    <XOctagon size={18} />
                    <span className="font-medium">拒绝</span>
                  </button>
                  <button
                    onClick={() => handleApprove(selectedAction.id)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
                  >
                    <CheckCircle size={18} />
                    <span className="font-medium">批准执行</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {showAlertModal && selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-100/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAlertModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="relative p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <AlertTriangle className="text-orange-700" size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-700">{selectedAlert.title}</h2>
                        <p className="text-sm text-gray-800 mt-0.5">风险预警详情</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAlertModal(false)}
                      className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <XCircle size={22} className="text-gray-800 hover:text-gray-800" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)] space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <AlertTriangle size={16} className="mr-2 text-orange-700" />
                    预警内容
                  </h3>
                  <p className="text-sm text-gray-600 bg-orange-50 border border-orange-200 p-4 rounded-xl leading-relaxed">
                    {selectedAlert.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock size={16} className="text-gray-800" />
                      <span className="text-xs font-bold text-gray-700">预警时间</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(selectedAlert.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target size={16} className="text-gray-800" />
                      <span className="text-xs font-bold text-gray-700">优先级</span>
                    </div>
                    <span className="text-sm px-2 py-1 rounded-full font-bold bg-rose-100 text-rose-800">
                      高风险
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Effect Modal */}
      <AnimatePresence>
        {showEffectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-100/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowEffectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/5" />
                <div className="relative p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <BarChart2 className="text-purple-700" size={28} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-700">决策效果追踪</h2>
                        <p className="text-sm text-gray-800 mt-0.5">预期 vs 实际效果对比分析</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEffectModal(false)}
                      className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <XCircle size={22} className="text-gray-800 hover:text-gray-800" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <DecisionEffectFeedback executions={effectExecutions} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DecisionOverview;
