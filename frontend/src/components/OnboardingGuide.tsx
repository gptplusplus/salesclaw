import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Network, MessageSquare, Sparkles, ArrowRight, X, Lightbulb, Target } from 'lucide-react';

interface OnboardingGuideProps {
  onComplete: () => void;
  onNavigate: (tab: string) => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete, onNavigate }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '欢迎使用 SalesClaw',
      subtitle: 'AI 驱动的医药销售智能决策平台',
      content: (
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
            <Sparkles className="text-white" size={36} />
          </div>
          <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
            SalesClaw 帮助您实时监控业务风险、智能推送决策建议、深度分析业务数据。让我们快速了解核心功能。
          </p>
        </div>
      ),
    },
    {
      title: '三大核心功能',
      subtitle: '日常工作的智能伙伴',
      content: (
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="text-white" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">工作台</h4>
              <p className="text-xs text-gray-600 mt-1">AI 自动监控业务风险，推送决策建议和洞察，一站式管理工作事项</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Network className="text-white" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">知识图谱</h4>
              <p className="text-xs text-gray-600 mt-1">浏览和管理医生、医院、产品等业务实体及其关系网络</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="text-white" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">AI 助手</h4>
              <p className="text-xs text-gray-600 mt-1">用自然语言查询业务数据，获取智能分析和决策建议</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '快速开始',
      subtitle: '试试这些操作',
      content: (
        <div className="space-y-3 py-4">
          <button
            onClick={() => onNavigate('chat')}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="text-purple-500" size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">问 AI 一个问题</div>
              <div className="text-xs text-gray-500">"张主任最近怎么样？"</div>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500" />
          </button>
          <button
            onClick={() => onNavigate('ontology')}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group"
          >
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Network className="text-emerald-500" size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 group-hover:text-emerald-600">查看知识图谱</div>
              <div className="text-xs text-gray-500">浏览医生、医院、产品关系</div>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-emerald-500" />
          </button>
          <button
            onClick={() => onNavigate('workspace')}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="text-blue-500" size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 group-hover:text-blue-600">浏览待决策事项</div>
              <div className="text-xs text-gray-500">查看 AI 推送的决策建议</div>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500" />
          </button>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
      >
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-8 bg-blue-500' : i < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onComplete}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-bold text-gray-900">{currentStep.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{currentStep.subtitle}</p>
              {currentStep.content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 pt-2 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              上一步
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              跳过
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              下一步
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              开始使用
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingGuide;
