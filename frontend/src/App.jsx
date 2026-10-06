import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';

// Lazy-loaded pages (Section 15: React memory optimization)
const ExecutiveOverview = lazy(() => import('./pages/ExecutiveOverview'));
const AccreditationKanban = lazy(() => import('./pages/AccreditationKanban'));
const DataEntryCenter = lazy(() => import('./pages/DataEntryCenter'));
const OperationalMetrics = lazy(() => import('./pages/OperationalMetrics'));
const ProcessMiningView = lazy(() => import('./pages/ProcessMiningView'));
const CounterfactualAnalysis = lazy(() => import('./pages/CounterfactualAnalysis'));
const DigitalTwinView = lazy(() => import('./pages/DigitalTwinView'));
const PeerBenchmarkRadar = lazy(() => import('./pages/PeerBenchmarkRadar'));
const AccreditationStandards = lazy(() => import('./pages/AccreditationStandards'));
const AlertsAnomalies = lazy(() => import('./pages/AlertsAnomalies'));
const ExecutiveReports = lazy(() => import('./pages/ExecutiveReports'));
const AICopilot = lazy(() => import('./pages/AICopilot'));
const DeanApprovals = lazy(() => import('./pages/DeanApprovals'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<ExecutiveOverview />} />
              <Route path="kanban" element={<AccreditationKanban />} />
              <Route path="data-entry" element={<DataEntryCenter />} />
              <Route path="metrics" element={<OperationalMetrics />} />
              <Route path="process-mining" element={<ProcessMiningView />} />
              <Route path="counterfactual" element={<CounterfactualAnalysis />} />
              <Route path="digital-twin" element={<DigitalTwinView />} />
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
  );
}
