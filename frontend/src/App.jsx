import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';

// Direct robust static imports (zero runtime chunk fetch failures)
import ExecutiveOverview from './pages/ExecutiveOverview';
import EvidenceTraceability from './pages/EvidenceTraceability';
import AccreditationKanban from './pages/AccreditationKanban';
import DataEntryCenter from './pages/DataEntryCenter';
import OperationalMetrics from './pages/OperationalMetrics';
import ProcessMiningView from './pages/ProcessMiningView';
import CounterfactualAnalysis from './pages/CounterfactualAnalysis';
import DigitalTwinView from './pages/DigitalTwinView';
import PeerBenchmarkRadar from './pages/PeerBenchmarkRadar';
import AccreditationStandards from './pages/AccreditationStandards';
import AlertsAnomalies from './pages/AlertsAnomalies';
import ExecutiveReports from './pages/ExecutiveReports';
import AICopilot from './pages/AICopilot';
import DeanApprovals from './pages/DeanApprovals';
import LoginPage from './pages/LoginPage';

// Error Boundary to prevent any blank white screen
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Application Mount Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center font-bold text-xl mb-4">
              🏥
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Hospital Intelligence Platform</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Updating application state and synchronizing real-time telemetry. Click below to refresh the workspace.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl transition shadow-lg shadow-blue-500/25"
            >
              Sync & Reload Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<ExecutiveOverview />} />
                <Route path="evidence" element={<EvidenceTraceability />} />
                <Route path="kanban" element={<AccreditationKanban />} />
                <Route path="capa" element={<AccreditationKanban />} />
                <Route path="data-entry" element={<DataEntryCenter />} />
                <Route path="metrics" element={<OperationalMetrics />} />
                <Route path="process-mining" element={<ProcessMiningView />} />
                <Route path="pathways" element={<ProcessMiningView />} />
                <Route path="counterfactual" element={<CounterfactualAnalysis />} />
                <Route path="digital-twin" element={<DigitalTwinView />} />
                <Route path="simulation" element={<DigitalTwinView />} />
                <Route path="benchmarks" element={<PeerBenchmarkRadar />} />
                <Route path="standards" element={<AccreditationStandards />} />
                <Route path="alerts" element={<AlertsAnomalies />} />
                <Route path="reports" element={<ExecutiveReports />} />
                <Route path="copilot" element={<AICopilot />} />
                <Route path="dean-approvals" element={<DeanApprovals />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  );
}
