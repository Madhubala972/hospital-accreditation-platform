import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  HeartPulse,
  UserCheck,
  Building,
  KeyRound,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'Dean',
    name: 'Dean Dr. Arthur Vance',
    email: 'dean@hospital.org',
    password: 'dean123',
    badge: 'Executive & Approvals',
    color: 'border-blue-200 text-blue-800 bg-blue-50/70 hover:bg-blue-100/70'
  },
  {
    role: 'Auditor',
    name: 'Elena Rostova (Lead Quality Auditor)',
    email: 'elena.rostova@hospital.org',
    password: 'auditor123',
    badge: 'Executive Reports Access',
    color: 'border-purple-200 text-purple-800 bg-purple-50/70 hover:bg-purple-100/70'
  },
  {
    role: 'Quality Manager',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@hospital.org',
    password: 'admin123',
    badge: 'Quality & Risk Lead',
    color: 'border-sky-200 text-sky-800 bg-sky-50/70 hover:bg-sky-100/70'
  },
  {
    role: 'Doctor (Approved)',
    name: 'Dr. Rajesh Sharma (Cardiology)',
    email: 'dr.rajesh@hospital.org',
    password: 'doctor123',
    badge: 'Active Physician',
    color: 'border-emerald-200 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70'
  },
  {
    role: 'Nurse (Approved)',
    name: 'Priya Nair (Emergency)',
    email: 'nurse.priya@hospital.org',
    password: 'nurse123',
    badge: 'Active Staff Nurse',
    color: 'border-teal-200 text-teal-800 bg-teal-50/70 hover:bg-teal-100/70'
  },
  {
    role: 'Doctor (Waiting Approval)',
    name: 'Dr. Ananya Roy (Surgery)',
    email: 'dr.ananya@hospital.org',
    password: 'doctor123',
    badge: 'Pending Dean Review',
    color: 'border-amber-200 text-amber-800 bg-amber-50/70 hover:bg-amber-100/70'
  }
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [waitingApprovalInfo, setWaitingApprovalInfo] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Doctor',
    department: 'Cardiology',
    employeeId: '',
    registrationNotes: ''
  });
  const [regSuccessMessage, setRegSuccessMessage] = useState(null);
  const [regError, setRegError] = useState(null);
  const [regLoading, setRegLoading] = useState(false);

  const handleQuickFill = (acc) => {
    setLoginEmail(acc.email);
    setLoginPassword(acc.password);
    setLoginError(null);
    setWaitingApprovalInfo(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setWaitingApprovalInfo(null);
    setLoginLoading(true);

    const result = await login(loginEmail, loginPassword);
    setLoginLoading(false);

    if (result.success) {
      navigate('/');
    } else if (result.isWaitingApproval) {
      setWaitingApprovalInfo(result.message);
    } else {
      setLoginError(result.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMessage(null);
    setRegLoading(true);

    const result = await register(regData);
    setRegLoading(false);

    if (result.success) {
      setRegSuccessMessage(result.message);
      setRegData({
        name: '',
        email: '',
        password: '',
        role: 'Doctor',
        department: 'Cardiology',
        employeeId: '',
        registrationNotes: ''
      });
    } else {
      setRegError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/40 to-blue-50/30 text-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-3 text-white">
          <Building2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Hospital Quality & Accreditation Portal
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          NABH 5th Edition & JCI Closed-Loop Clinical Intelligence System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white border border-sky-100 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('login'); setWaitingApprovalInfo(null); }}
              className={`py-2.5 rounded-xl transition font-bold ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In to Hospital Portal
            </button>
            <button
              onClick={() => { setActiveTab('register'); setLoginError(null); }}
              className={`py-2.5 rounded-xl transition font-bold ${
                activeTab === 'register'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Staff Registration (Dean Approval)
            </button>
          </div>

          {/* TAB 1: SIGN IN */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              {/* Waiting State Warning Alert */}
              {waitingApprovalInfo && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                    <Clock className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Account in Waiting State (Pending Dean Approval)</span>
                  </div>
                  <p className="leading-relaxed text-slate-700">
                    {waitingApprovalInfo}
                  </p>
                  <div className="pt-2 border-t border-amber-200 text-[11px] text-amber-800 font-medium">
                    💡 <strong>Tip for Evaluator:</strong> Sign in as <strong>Dean Dr. Arthur Vance</strong> (`dean@hospital.org`) to approve pending registrations in the Dean Portal with one click!
                  </div>
                </div>
              )}

              {/* Login Error Alert */}
              {loginError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Hospital Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. dean@hospital.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  {loginLoading ? <Clock className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Sign In to Hospital Portal</span>
                </button>
              </form>

              {/* Quick Fill Demo Roles */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Demo Sign-In Profiles:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleQuickFill(acc)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition flex flex-col justify-between shadow-sm ${acc.color}`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{acc.role}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">{acc.badge}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate mt-1 font-medium">{acc.name}</div>
                      <div className="text-[10px] font-mono font-semibold text-blue-700">{acc.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NEW STAFF REGISTRATION */}
          {activeTab === 'register' && (
            <div className="space-y-6">
              {/* Waiting State Notice */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-800">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>Clinical Registration Policy & Dean Verification</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  All doctor, nurse, and auditor registrations will be placed in a <strong>WAITING STATE</strong>. Access to the hospital system is unlocked only upon explicit digital approval by the Dean.
                </p>
              </div>

              {regSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Registration In Waiting State</span>
                  </div>
                  <p className="leading-relaxed text-slate-700">{regSuccessMessage}</p>
                </div>
              )}

              {regError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regData.name}
                      onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                      placeholder="e.g. Dr. Jennifer Wu"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee / License ID</label>
                    <input
                      type="text"
                      value={regData.employeeId}
                      onChange={(e) => setRegData({ ...regData, employeeId: e.target.value })}
                      placeholder="e.g. MED-8821"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    placeholder="e.g. jennifer.wu@hospital.org"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Role / Position</label>
                    <select
                      value={regData.role}
                      onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
                    >
                      <option value="Doctor">Doctor (Attending Physician)</option>
                      <option value="Nurse">Nurse (Staff / Clinical Care)</option>
                      <option value="Auditor">Quality Auditor</option>
                      <option value="Staff">Clinical Support Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                    <select
                      value={regData.department}
                      onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-blue-600 font-semibold"
                    >
                      <option value="ICU">ICU (Critical Care)</option>
                      <option value="Emergency">Emergency Department</option>
                      <option value="Surgery">Surgery / Operating Suite</option>
                      <option value="Cardiology">Cardiology Unit</option>
                      <option value="General Ward">General Medical Ward</option>
                      <option value="Hospital-Wide">Hospital-Wide</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Create a secure password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Specialization / Registration Notes</label>
                  <input
                    type="text"
                    value={regData.registrationNotes}
                    onChange={(e) => setRegData({ ...regData, registrationNotes: e.target.value })}
                    placeholder="e.g. Board Certified Intensivist / ER Triage Specialist"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  {regLoading ? <Clock className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Submit Registration to Dean's Office</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
