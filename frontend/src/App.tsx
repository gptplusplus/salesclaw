import { useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { OntologyProvider } from './contexts/OntologyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OnboardingGuide from './components/OnboardingGuide';

const DecisionOverview = lazy(() => import('./components/DecisionOverview'));
const OntologyGraphView = lazy(() => import('./components/OntologyGraphView'));
const ScenarioSim = lazy(() => import('./components/ScenarioSim'));
const InsightEngine = lazy(() => import('./components/InsightEngine'));
const InferenceRulesPanel = lazy(() => import('./components/InferenceRulesPanel'));
const AIToolbox = lazy(() => import('./components/AIToolbox'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const pageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
};

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('salesclaw_onboarded'));
  const { user } = useAuth();

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'workspace': return <DecisionOverview onTabChange={setActiveTab} />;
        case 'ontology': return <OntologyGraphView />;
        case 'insights': return <InsightEngine />;
        case 'rules': return <InferenceRulesPanel />;
        case 'scenario': return <ScenarioSim />;
        case 'chat': return <ChatInterface />;
        case 'tools': return <AIToolbox />;
        default: return <DecisionOverview onTabChange={setActiveTab} />;
      }
    })();

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }>
        {content}
      </Suspense>
    );
  };

  const userId = user?.id || 'default_user';

  return (
    <OntologyProvider userId={userId}>
      <Layout activeTab={activeTab} onTabChange={setActiveTab} onNavigateToOntology={() => {}} onShowHelp={() => setShowOnboarding(true)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full w-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </Layout>
      {showOnboarding && (
        <OnboardingGuide onComplete={() => {
          localStorage.setItem('salesclaw_onboarded', 'true');
          setShowOnboarding(false);
        }} onNavigate={(tab) => {
          setActiveTab(tab);
          setShowOnboarding(false);
        }} />
      )}
    </OntologyProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 border-4 border-blue-300 border-t-blue-500 rounded-full animate-spin mb-4" />
          <div className="text-white font-medium text-lg animate-pulse">Loading...</div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
