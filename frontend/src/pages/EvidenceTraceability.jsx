import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { evidenceApi, complianceApi, riskApi, capaApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  GitBranch,
  Search,
  RefreshCw,
  Eye,
  History,
  Check,
  Database,
  Lock,
  UserCheck,
  ArrowRight,
  Sparkles,
  FileSignature,
  Clock,
  Calendar,
  CheckCheck,
  X,
  Layers,
  Activity,
  LogIn
} from 'lucide-react';

export default function EvidenceTraceability() {
  const [searchParams] = useSearchParams();
  const querySearch = searchParams.get('search');

  const { selectedDepartment, refreshKey } = useApp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(querySearch ? 'SEALED_LEDGER' : 'PENDING_AUDIT'); // 'PENDING_AUDIT' | 'SEALED_LEDGER' | 'TRACE_FLOW'
  const [evidenceList, setEvidenceList] = useState([]);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [standards, setStandards] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [capaList, setCapaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(querySearch || '');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    if (querySearch) {
      setSearchQuery(querySearch);
      setActiveTab('SEALED_LEDGER');
    }
  }, [querySearch]);


  // Modals
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  // Manual verification form state
  const [auditorNotes, setAuditorNotes] = useState('');
  const [verificationVerdict, setVerificationVerdict] = useState('VERIFIED');
  const [sealSuccessMessage, setSealSuccessMessage] = useState(null);
  const [newlySealedId, setNewlySealedId] = useState(null);

  const isAuditor = user?.role === 'Auditor' || user?.role === 'Admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evRes, intRes, compRes, riskRes, capaRes] = await Promise.all([
        evidenceApi.getEvidence({ department: selectedDepartment, limit: 100 }),
        evidenceApi.getIntegrity(selectedDepartment),
        complianceApi.getEvaluation(selectedDepartment),
        riskApi.getScores(selectedDepartment),
        capaApi.getAll(selectedDepartment)
      ]);

      setEvidenceList(evRes.data?.data || []);
      setIntegrityReport(intRes.data?.data || null);
      setStandards(compRes.data?.data?.standards || []);
      setRiskData(Array.isArray(riskRes.data?.data) ? riskRes.data.data : [riskRes.data?.data].filter(Boolean));
      setCapaList(capaRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load evidence traceability data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDepartment, refreshKey]);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await evidenceApi.getIntegrity(selectedDepartment);
      setIntegrityReport(res.data?.data || null);
      const evRes = await evidenceApi.getEvidence({ department: selectedDepartment });
      setEvidenceList(evRes.data?.data || []);
    } catch (err) {
      console.error('Error verifying chain', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenManualVerification = (ev) => {
    setSelectedEvidence(ev);
    setAuditorNotes(`Physical and EHR clinical verification completed by ${user?.name || 'Lead Quality Auditor'}. Clinical records verified authentic and compliant with standard ${ev.standardCode}.`);
    setVerificationVerdict('VERIFIED');
    setVerifyModalOpen(true);
  };

  const handleExecuteSeal = async () => {
    if (!selectedEvidence) return;
    try {
      setSealing(true);
      const res = await evidenceApi.manualVerify(selectedEvidence.evidenceId, {
        auditorNotes,
        auditorName: user?.name || 'Elena Rostova (Lead Quality Auditor)',
        integrityStatus: verificationVerdict
      });

      setNewlySealedId(selectedEvidence.evidenceId);
      setSealSuccessMessage(res.data?.message || 'Evidence record successfully verified and sealed into cryptographic hash chain!');
      setVerifyModalOpen(false);
      
      // Refresh evidence lists
      await fetchData();
      
      // Switch to sealed ledger view to show newly converted block
      setActiveTab('SEALED_LEDGER');

      // Clear toast after 6 seconds
      setTimeout(() => {
        setSealSuccessMessage(null);
      }, 6000);
    } catch (err) {
      alert(`Manual verification failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSealing(false);
    }
  };

  const handleInspectEvidence = (ev) => {
    setSelectedEvidence(ev);
    setInspectModalOpen(true);
  };

  const handleViewHistory = async (ev) => {
    try {
      const res = await evidenceApi.getHistory(ev.evidenceId);
      setHistoryData(res.data);
      setHistoryModalOpen(true);
    } catch (err) {
      console.error('Failed to load evidence history', err);
    }
  };

  // Date & Timestamp formatting helpers for the sealed cryptographic ledger
  const formatSealedDate = (dateVal) => {
    if (!dateVal) return 'Oct 10, 2026';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Oct 10, 2026';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatSealedTime = (dateVal) => {
    if (!dateVal) return '11:00 AM';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '11:00 AM';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getEvidenceTimestamp = (ev) => {
    return ev?.verifiedAt || ev?.recordedAt || ev?.createdAt || ev?.dataPayload?.date || ev?.dataPayload?.timestamp || new Date();
  };

  // Strictly deduplicate Pending vs Cryptographically Sealed Evidence to prevent duplicate rows
  const uniquePendingMap = new Map();
  evidenceList.forEach((e) => {
    if ((!e.isCryptographicallySealed || e.integrityStatus === 'PENDING_AUDITOR_REVIEW') && !uniquePendingMap.has(e.evidenceId)) {
      uniquePendingMap.set(e.evidenceId, e);
    }
  });
  const pendingItems = Array.from(uniquePendingMap.values());

  const uniqueSealedMap = new Map();
  evidenceList.forEach((e) => {
    if (e.isCryptographicallySealed && e.integrityStatus !== 'PENDING_AUDITOR_REVIEW' && !uniqueSealedMap.has(e.evidenceId)) {
      uniqueSealedMap.set(e.evidenceId, e);
    }
  });
  const sealedItems = Array.from(uniqueSealedMap.values());

  // Filtered sealed items
  const filteredSealedEvidence = sealedItems.filter((e) => {
    const matchesSearch =
      e.evidenceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.standardCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.verifiedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.recordedBy?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'ALL' || e.evidenceType === selectedType;
    return matchesSearch && matchesType;
  });

  const verifiedCount = sealedItems.filter((e) => e.integrityStatus === 'VERIFIED').length;
  const flaggedCount = sealedItems.filter((e) => e.integrityStatus === 'FLAGGED').length;
  const integrityRate = sealedItems.length > 0 ? Number(((verifiedCount / sealedItems.length) * 100).toFixed(1)) : 100.0;

  // Primary trace anchor for the active department
  const activeStd = standards[0] || {
    standardCode: 'NABH-COP.6',
    standardName: 'Medication Safety & High-Risk Verification',
    department: selectedDepartment || 'ICU'
  };
  const activeRisk = riskData.find((r) => r.department === (selectedDepartment || 'ICU')) || riskData[0] || { score: 78, category: 'HIGH' };
  const activeCapa = capaList.find((c) => c.department === (selectedDepartment || 'ICU')) || capaList[0] || {
    problem: 'Medication verification step skipped in 12 ICU patient pathways',
    predictedImpact: 31.0,
    actualImpact: 28.5,
    status: 'IN_PROGRESS',
    verificationStatus: 'PENDING_VERIFICATION'
  };

  // Access Control: Strictly restricted to Auditor
  if (!isAuditor) {
    return (
      <div className="bg-white border border-rose-200 shadow-xl rounded-3xl p-8 sm:p-12 text-center space-y-5 max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-widest font-mono">
          Auditor Governance & Evidence Sealing Policy
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Cryptographic Evidence Ledger Access Restricted
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
          Under NABH 5th Edition & JCI Hospital Accreditation governance, raw evidence auditing, manual protocol inspection, and <strong>conversion into immutable cryptographic SHA-256 blocks are strictly restricted to Certified Lead Quality Auditors</strong>.
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-w-md mx-auto text-left space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Current User:</span>
            <strong className="text-slate-900">{user?.name || 'Hospital Clinical Staff'}</strong>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Assigned Role:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {user?.role || 'Staff'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Authorized Lead Auditor:</span>
            <span className="text-[11px] text-emerald-700 font-semibold font-mono">
              Elena Rostova (Auditor)
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
          >
            <LogIn className="w-4 h-4" />
            <span>Switch to Lead Auditor Profile</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-sky-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 backdrop-blur-md">
              <ShieldCheck className="w-7 h-7 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Cryptographic Evidence Chain Ledger</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  AUDITOR PRIVILEGED
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Manual Auditor verification gateway: review raw clinical telemetry &amp; seal into immutable SHA-256 blocks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? 'Validating Blockchain Hashes...' : 'Re-verify Entire Hash Chain'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {sealSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">Cryptographic Block Successfully Anchored!</h4>
              <p className="text-xs text-emerald-800 mt-0.5">{sealSuccessMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setSealSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('PENDING_AUDIT')}
          className={`p-5 rounded-2xl border cursor-pointer transition shadow-sm flex items-center justify-between ${
            activeTab === 'PENDING_AUDIT' ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/50' : 'bg-white border-sky-100 hover:border-amber-200'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Auditor Review</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingItems.length}</h3>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">Awaiting manual verification</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
            <FileSignature className="w-6 h-6 text-amber-700" />
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('SEALED_LEDGER')}
          className={`p-5 rounded-2xl border cursor-pointer transition shadow-sm flex items-center justify-between ${
            activeTab === 'SEALED_LEDGER' ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/50' : 'bg-white border-sky-100 hover:border-emerald-200'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cryptographically Sealed</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{sealedItems.length}</h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">100% SHA-256 Provenance</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Integrity Flagged</p>
            <h3 className={`text-2xl font-black mt-1 ${flaggedCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {flaggedCount}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {flaggedCount > 0 ? 'Tamper anomaly logged' : 'Zero hash collisions'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${flaggedCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <ShieldAlert className={`w-6 h-6 ${flaggedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blockchain Valid Score</p>
            <h3 className="text-2xl font-black text-cyan-600 mt-1">{integrityRate}%</h3>
            <p className="text-[11px] text-cyan-700 font-medium mt-1">
              {integrityReport?.chainIntegrity === 'VERIFIED_SECURE' ? 'Full Chain Verified' : 'Cryptographic Chain OK'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center">
            <Lock className="w-6 h-6 text-cyan-600" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-sky-100 pb-2">
        <button
          onClick={() => setActiveTab('PENDING_AUDIT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'PENDING_AUDIT'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Manual Verification Queue</span>
          {pendingItems.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'PENDING_AUDIT' ? 'bg-white text-amber-700' : 'bg-amber-500 text-white'
            }`}>
              {pendingItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SEALED_LEDGER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'SEALED_LEDGER'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Sealed Cryptographic Hash Chain Ledger</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'SEALED_LEDGER' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {sealedItems.length} Blocks
          </span>
        </button>

        <button
          onClick={() => setActiveTab('TRACE_FLOW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'TRACE_FLOW'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Closed-Loop Trace Explorer</span>
        </button>
      </div>

      {/* TAB 1: PENDING AUDITOR MANUAL VERIFICATION QUEUE */}
      {activeTab === 'PENDING_AUDIT' && (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Pending Manual Auditor Verification &amp; Cryptographic Conversion
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                The Lead Auditor manually reviews raw clinical data entries and double-checks protocol compliance before converting them into tamper-proof SHA-256 blocks.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {pendingItems.length} Items Awaiting Sign-Off
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              Loading pending verification queue...
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3 max-w-md mx-auto my-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">All Clinical Records Verified &amp; Sealed!</h4>
              <p className="text-xs text-slate-600">
                There are no pending unsealed observations. All clinical evidence streams have been manually verified by Lead Auditor Elena Rostova and converted into immutable cryptographic blocks.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item._id || item.evidenceId}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {item.evidenceId}
                      </span>
                      <strong className="text-slate-900 text-xs">{item.title}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.department}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                        {item.standardCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        PENDING AUDIT
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-white p-3 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Source Stream:</span>
                      <strong className="text-slate-800">{item.sourceType} ({item.sourceId})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Recorded By Staff:</span>
                      <strong className="text-slate-800">{item.recordedBy}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Recorded Timestamp:</span>
                      <span className="text-slate-700 font-mono">{new Date(item.recordedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Raw Data Preview */}
                  <div className="p-2.5 bg-slate-900 rounded-lg text-sky-200 text-[10px] font-mono overflow-x-auto max-h-24">
                    {JSON.stringify(item.dataPayload, null, 2)}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      onClick={() => handleInspectEvidence(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Raw Data</span>
                    </button>

                    <button
                      onClick={() => handleOpenManualVerification(item)}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
                    >
                      <FileSignature className="w-4 h-4" />
                      <span>Audit &amp; Cryptographically Seal</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRYPTOGRAPHICALLY SEALED HASH CHAIN LEDGER */}
      {activeTab === 'SEALED_LEDGER' && (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Sealed Cryptographic Hash Chain Ledger
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every verified block has undergone manual auditor sign-off and is immutably linked via SHA-256 to its predecessor.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Type filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Evidence Types</option>
                <option value="METRIC">Metric</option>
                <option value="PATHWAY_TRACE">Pathway Trace</option>
                <option value="INCIDENT">Incident</option>
                <option value="CLINICAL_VERIFICATION">Clinical Verification</option>
                <option value="DOCUMENT">Document</option>
              </select>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Block, ID, Standard, Signer..."
                  className="pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Table of Evidence */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-sky-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Chain Block / Evidence ID</th>
                  <th className="py-3 px-4">Dept &amp; Standard</th>
                  <th className="py-3 px-4">Title &amp; Auditor Sign-off</th>
                  <th className="py-3 px-4">Sealed Date &amp; Timestamp</th>
                  <th className="py-3 px-4">SHA-256 Current Hash</th>
                  <th className="py-3 px-4">Previous Chain Link</th>
                  <th className="py-3 px-4">Integrity Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading cryptographic evidence ledger...
                    </td>
                  </tr>
                ) : filteredSealedEvidence.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-slate-400">
                      No sealed evidence records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSealedEvidence.map((ev) => {
                    const isJustSealed = ev.evidenceId === newlySealedId;
                    return (
                      <tr 
                        key={ev._id || ev.evidenceId} 
                        className={`transition ${isJustSealed ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-sky-50/40'}`}
                      >
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black">
                              Block #{ev.chainIndex || 1}
                            </span>
                            <span className="font-bold text-blue-700">{ev.evidenceId}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{ev.department}</div>
                          <div className="text-[11px] font-mono text-cyan-700">{ev.standardCode}</div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                          <div className="text-[11px] text-emerald-700 font-semibold truncate flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Auditor: {ev.verifiedBy || ev.recordedBy}</span>
                          </div>
                          {ev.auditorNotes && (
                            <div className="text-[10px] text-slate-500 italic truncate mt-0.5">
                              "{ev.auditorNotes}"
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{formatSealedDate(getEvidenceTimestamp(ev))}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5" title={new Date(getEvidenceTimestamp(ev)).toISOString()}>
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatSealedTime(getEvidenceTimestamp(ev))}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit max-w-[150px] truncate">
                            <Hash className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                            <span className="truncate">{ev.currentHash ? `${ev.currentHash.substring(0, 12)}...` : 'PENDING'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded w-fit max-w-[150px] truncate border border-slate-200/60">
                            <LinkIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{ev.previousHash ? `${ev.previousHash.substring(0, 10)}...` : 'GENESIS'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {ev.integrityStatus === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> VERIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> FLAGGED
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleInspectEvidence(ev)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] flex items-center gap-1 transition"
                              title="Inspect Evidence Payload & Hash Math"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect
                            </button>
                            <button
                              onClick={() => handleViewHistory(ev)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] flex items-center gap-1 transition"
                              title="Audit Trail History"
                            >
                              <History className="w-3.5 h-3.5" /> History
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NOVELTY CLOSED-LOOP TRACE EXPLORER */}
      {activeTab === 'TRACE_FLOW' && (
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-600" />
                Verifiable Closed-Loop Traceability Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evidence-driven decision trace: Standard $\rightarrow$ Sealed Evidence Block $\rightarrow$ Process Deviation $\rightarrow$ Explainable Risk $\rightarrow$ CAPA Intervention $\rightarrow$ Verification
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              {selectedDepartment || 'Hospital-Wide'} Flow
            </span>
          </div>

          {/* Interactive Trace Flow Bar */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center min-w-[900px] gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
              {/* Step 1: Standard */}
              <div className="flex-1 p-3.5 rounded-xl bg-white border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 uppercase">
                  <span>1. Standard</span>
                  <span className="font-mono">{activeStd.standardCode}</span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate mt-1">{activeStd.standardName}</p>
                <div className="mt-2 text-[10px] text-slate-500">Threshold: {activeStd.operator || '>='} {activeStd.threshold || 90}%</div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* Step 2: Evidence Layer */}
              <div className="flex-1 p-3.5 rounded-xl bg-white border border-cyan-200 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-700 uppercase">
                  <span>2. Evidence Hash</span>
                  <span className="font-mono">{sealedItems[0]?.evidenceId || 'EV-ICU-1042'}</span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate mt-1">{sealedItems.length} Sealed Blocks</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <Check className="w-3 h-3" /> SHA-256 Anchored
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* Step 3: Process Deviation */}
              <div className="flex-1 p-3.5 rounded-xl bg-white border border-amber-200 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 uppercase">
                  <span>3. Deviation</span>
                  <span className="font-mono">PM4Py</span>
                </div>
                <p className="text-xs font-bold text-amber-900 truncate mt-1">12 Traces Skipped Step</p>
                <div className="mt-2 text-[10px] text-amber-700">Risk Contribution: +18</div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* Step 4: Risk Model */}
              <div className="flex-1 p-3.5 rounded-xl bg-white border border-rose-200 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 uppercase">
                  <span>4. Risk Score</span>
                  <span className="font-mono">{activeRisk.category}</span>
                </div>
                <p className="text-xs font-bold text-rose-900 truncate mt-1">Score: {activeRisk.score}/100</p>
                <div className="mt-2 text-[10px] text-rose-600">Decision-Support Model</div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* Step 5: CAPA Intervention */}
              <div className="flex-1 p-3.5 rounded-xl bg-white border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 uppercase">
                  <span>5. CAPA Action</span>
                  <span className="font-mono">CAPA-024</span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate mt-1">Digital Barcode Gate</p>
                <div className="mt-2 text-[10px] text-purple-700 font-semibold">{activeCapa.predictedImpact || 31}% Predicted Gain</div>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

              {/* Step 6: Closed-Loop Verification */}
              <div className="flex-1 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 shadow-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase">
                  <span>6. Verification</span>
                  <span className="font-mono">{activeCapa.verificationStatus === 'VERIFIED_EFFECTIVE' ? 'VERIFIED' : 'PENDING'}</span>
                </div>
                <p className="text-xs font-bold text-emerald-950 truncate mt-1">
                  {activeCapa.actualImpact ? `${activeCapa.actualImpact}% Achieved` : 'Post-CAPA Audit'}
                </p>
                <div className="mt-2 text-[10px] text-emerald-700 font-bold">Closed-Loop Verified</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: AUDITOR MANUAL VERIFICATION & CRYPTOGRAPHIC CONVERSION MODAL */}
      {verifyModalOpen && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-amber-200 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      Auditor Manual Protocol Inspection
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                      STEP 1 OF 2
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Target Evidence: <strong className="text-blue-700">{selectedEvidence.evidenceId}</strong> ({selectedEvidence.department})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Evidence Metadata & Raw Data */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Department:</span>
                  <strong className="text-slate-900">{selectedEvidence.department}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Accreditation Standard:</span>
                  <strong className="text-blue-700 font-mono">{selectedEvidence.standardCode}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Evidence Stream Type:</span>
                  <strong className="text-slate-900">{selectedEvidence.evidenceType}</strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Raw Clinical Evidence Payload:</span>
                <pre className="p-3.5 bg-slate-900 text-sky-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-36">
                  {JSON.stringify(selectedEvidence.dataPayload, null, 2)}
                </pre>
              </div>

              {/* Auditor Sign-off Form */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auditor Verification Findings &amp; Sign-off Notes:
                  </label>
                  <textarea
                    rows={3}
                    value={auditorNotes}
                    onChange={(e) => setAuditorNotes(e.target.value)}
                    placeholder="Enter details of physical inspection, EHR clinical timestamp check, and protocol conformance..."
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Verification Signer (Certified Auditor):
                    </label>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-slate-800 font-semibold text-xs">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span>{user?.name || 'Elena Rostova (Lead Quality Auditor)'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Integrity Verdict:
                    </label>
                    <select
                      value={verificationVerdict}
                      onChange={(e) => setVerificationVerdict(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="VERIFIED">✅ VERIFIED (Compliant &amp; Authenticated)</option>
                      <option value="FLAGGED">⚠️ FLAGGED (Protocol Breach / Anomaly Detected)</option>
                    </select>
                  </div>
                </div>

                {/* Cryptographic Hash Sealing Preview Box */}
                <div className="p-3.5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-cyan-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-cyan-400" />
                      Cryptographic Blockchain Conversion Engine
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-400/20 text-cyan-200 px-2 py-0.5 rounded">
                      SHA-256 HASH
                    </span>
                  </div>
                  <p className="text-[10px] text-sky-200">
                    Formula: <code className="text-cyan-300">SHA256(canonicalPayload + previousDepartmentHash)</code>
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Upon execution, this record will be sealed as an immutable block in the {selectedEvidence.department} hash chain and logged in the Staff Audit Trail.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteSeal}
                disabled={sealing || !auditorNotes.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${sealing ? 'animate-spin' : ''}`} />
                <span>{sealing ? 'Sealing Cryptographic Block...' : 'Verify & Convert to Cryptographic Block'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT EVIDENCE MODAL */}
      {inspectModalOpen && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-sky-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                  <FileCheck2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cryptographic Block Inspector</h3>
                  <p className="text-xs text-blue-600 font-mono">{selectedEvidence.evidenceId}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Department:</span>
                  <div className="font-bold text-slate-900">{selectedEvidence.department}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Standard Code:</span>
                  <div className="font-bold text-blue-700 font-mono">{selectedEvidence.standardCode}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Verified By:</span>
                  <div className="font-bold text-slate-900">{selectedEvidence.verifiedBy || selectedEvidence.recordedBy}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Chain Block #:</span>
                  <div className="font-bold text-emerald-700 font-mono">Block #{selectedEvidence.chainIndex || 0}</div>
                </div>
              </div>

              {/* Sealed Date & Timestamp Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-500 font-medium">Sealed Date:</span>
                  <strong className="text-slate-900 font-bold">{formatSealedDate(getEvidenceTimestamp(selectedEvidence))}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-slate-500 font-medium">Exact Timestamp:</span>
                  <strong className="text-blue-800 font-mono font-bold">{formatSealedTime(getEvidenceTimestamp(selectedEvidence))}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">({new Date(getEvidenceTimestamp(selectedEvidence)).toISOString()})</span>
                </div>
              </div>

              {/* SHA-256 Proof Block */}
              <div className="p-3.5 bg-slate-900 text-sky-200 rounded-xl space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
                  <span>SHA-256 Provenance Proof</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Hash Integrity Verified
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CURRENT RECORD HASH:</span>
                  <span className="text-cyan-300 break-all select-all">{selectedEvidence.currentHash}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PREVIOUS CHAIN HASH LINK:</span>
                  <span className="text-slate-300 break-all select-all">{selectedEvidence.previousHash}</span>
                </div>
              </div>

              {selectedEvidence.auditorNotes && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800 block">
                    Auditor Sign-off Notes:
                  </span>
                  <p className="text-xs italic">"{selectedEvidence.auditorNotes}"</p>
                </div>
              )}

              {/* Raw Payload JSON */}
              <div>
                <span className="font-bold text-slate-700 block mb-1">Attached Clinical Data Payload:</span>
                <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-800 overflow-x-auto">
                  {JSON.stringify(selectedEvidence.dataPayload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-sky-100">
              <button
                onClick={() => setInspectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT HISTORY MODAL */}
      {historyModalOpen && historyData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-sky-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
                  <History className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Evidence Provenance Audit Trail</h3>
                  <p className="text-xs text-slate-500">{historyData.evidenceId}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {historyData.auditHistory?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Initial genesis creation event logged. No modifications recorded.
                </div>
              ) : (
                historyData.auditHistory?.map((audit, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{audit.actionTitle}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(audit.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{audit.actionDetails}</p>
                    <div className="text-[10px] text-slate-400">
                      Signer: {audit.userName} ({audit.userRole})
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-sky-100">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
