const path = require('path');
const backendNodeModules = path.resolve(__dirname, '../../backend/node_modules');
const mongoose = require(path.join(backendNodeModules, 'mongoose'));
const bcrypt = require(path.join(backendNodeModules, 'bcryptjs'));

const User = require('../../backend/models/User');
const HospitalMetric = require('../../backend/models/HospitalMetric');
const PatientPathway = require('../../backend/models/PatientPathway');
const AccreditationStandard = require('../../backend/models/AccreditationStandard');
const RiskScore = require('../../backend/models/RiskScore');
const Alert = require('../../backend/models/Alert');
const CapaPlan = require('../../backend/models/CapaPlan');
const Benchmark = require('../../backend/models/Benchmark');
const StaffAuditLog = require('../../backend/models/StaffAuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_accreditation';

async function seedDatabase() {
  console.log(`[Seed] Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected. Dropping database for clean index generation...');

  await mongoose.connection.db.dropDatabase();
  console.log('[Seed] Database dropped.');

  // 1. Seed Users
  console.log('[Seed] Seeding users with Dean approval statuses...');
  const salt = await bcrypt.genSalt(10);
  const deanPassword = await bcrypt.hash('dean123', salt);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const auditorPassword = await bcrypt.hash('auditor123', salt);
  const doctorPassword = await bcrypt.hash('doctor123', salt);
  const nursePassword = await bcrypt.hash('nurse123', salt);

  const users = await User.create([
    {
      name: 'Dean Dr. Arthur Vance',
      email: 'dean@hospital.org',
      passwordHash: deanPassword,
      role: 'Dean',
      department: 'Hospital-Wide',
      employeeId: 'DEAN-001',
      approvalStatus: 'APPROVED',
      approvedBy: 'Board of Governors',
      approvedAt: new Date()
    },
    {
      name: 'Elena Rostova (Lead Quality Auditor)',
      email: 'elena.rostova@hospital.org',
      passwordHash: auditorPassword,
      role: 'Auditor',
      department: 'ICU',
      employeeId: 'AUD-102',
      approvalStatus: 'APPROVED',
      approvedBy: 'Dean Dr. Arthur Vance',
      approvedAt: new Date()
    },
    {
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@hospital.org',
      passwordHash: adminPassword,
      role: 'Quality_Manager',
      department: 'Hospital-Wide',
      employeeId: 'QM-004',
      approvalStatus: 'APPROVED',
      approvedBy: 'Dean Dr. Arthur Vance',
      approvedAt: new Date()
    },
    {
      name: 'Dr. Rajesh Sharma (Chief Cardiologist)',
      email: 'dr.rajesh@hospital.org',
      passwordHash: doctorPassword,
      role: 'Doctor',
      department: 'Cardiology',
      employeeId: 'DOC-204',
      approvalStatus: 'APPROVED',
      approvedBy: 'Dean Dr. Arthur Vance',
      approvedAt: new Date()
    },
    {
      name: 'Priya Nair (Senior ER Nurse)',
      email: 'nurse.priya@hospital.org',
      passwordHash: nursePassword,
      role: 'Nurse',
      department: 'Emergency',
      employeeId: 'NUR-308',
      approvalStatus: 'APPROVED',
      approvedBy: 'Dean Dr. Arthur Vance',
      approvedAt: new Date()
    },
    // New Registrations in WAITING STATE pending Dean Approval
    {
      name: 'Dr. Ananya Roy (Surgical Fellow)',
      email: 'dr.ananya@hospital.org',
      passwordHash: doctorPassword,
      role: 'Doctor',
      department: 'Surgery',
      employeeId: 'DOC-512',
      approvalStatus: 'WAITING_APPROVAL',
      registrationNotes: 'New faculty registration for General Surgery unit.'
    },
    {
      name: 'Vikram Joshi (ICU Staff Nurse)',
      email: 'nurse.vikram@hospital.org',
      passwordHash: nursePassword,
      role: 'Nurse',
      department: 'ICU',
      employeeId: 'NUR-841',
      approvalStatus: 'WAITING_APPROVAL',
      registrationNotes: 'Night shift intensive care nursing credential verification.'
    }
  ]);

  // 2. Seed Accreditation Standards (NABH 5th Ed & JCI Quality Guidelines)
  console.log('[Seed] Seeding accreditation standards...');
  const standardsData = [
    {
      standardCode: 'NABH-COP.6',
      standardName: 'Medication Safety & High-Risk Verification',
      department: 'ICU',
      category: 'Patient Safety',
      requirement: 'Mandatory two-clinician digital verification for high-risk medication administration prior to treatment.',
      threshold: 90.0,
      operator: '>=',
      metricTargetField: 'pathwayConformance',
      severity: 'CRITICAL',
      ruleDescription: 'Clinical pathway conformance must be >= 90% in ICU to maintain patient safety accreditation.',
      regulatoryBody: 'NABH 5th Edition'
    },
    {
      standardCode: 'NABH-IC.1',
      standardName: 'Healthcare-Associated Infection Control',
      department: 'ICU',
      category: 'Infection Control',
      requirement: 'Hospital acquired infection (HAI) rate must not exceed 2.0% in critical care units.',
      threshold: 2.0,
      operator: '<=',
      metricTargetField: 'infectionRate',
      severity: 'HIGH',
      ruleDescription: 'ICU Infection Rate must be <= 2.0%',
      regulatoryBody: 'NABH 5th Edition'
    },
    {
      standardCode: 'NABH-HRM.3',
      standardName: 'Critical Care Nurse-to-Patient Staffing Ratio',
      department: 'ICU',
      category: 'Facility & Staffing',
      requirement: 'Dedicated nurse-to-patient staffing ratio must meet or exceed 0.33 (1:3 ratio) in intensive care.',
      threshold: 0.33,
      operator: '>=',
      metricTargetField: 'staffingLevel',
      severity: 'HIGH',
      ruleDescription: 'Staffing Level in ICU must be >= 0.33',
      regulatoryBody: 'NABH 5th Edition'
    },
    {
      standardCode: 'NABH-AAC.4',
      standardName: 'Emergency Door-to-Doctor Triage Time',
      department: 'Emergency',
      category: 'Clinical Care',
      requirement: 'Average Emergency triage and physician initial contact time must be within 30 minutes.',
      threshold: 30.0,
      operator: '<=',
      metricTargetField: 'avgWaitingTime',
      severity: 'HIGH',
      ruleDescription: 'Average waiting time in Emergency Department must be <= 30 mins',
      regulatoryBody: 'NABH 5th Edition'
    },
    {
      standardCode: 'JCI-IPSG.4',
      standardName: 'Surgical Safety Checklist Conformance',
      department: 'Surgery',
      category: 'Patient Safety',
      requirement: 'Full execution of WHO surgical safety checklist (Sign-in, Time-out, Sign-out) before incision.',
      threshold: 95.0,
      operator: '>=',
      metricTargetField: 'pathwayConformance',
      severity: 'CRITICAL',
      ruleDescription: 'Surgery pathway conformance must be >= 95%',
      regulatoryBody: 'JCI International Patient Safety'
    },
    {
      standardCode: 'NABH-COP.12',
      standardName: 'Cardiology Door-to-Balloon / ECG Conformance',
      department: 'Cardiology',
      category: 'Clinical Care',
      requirement: 'Rapid diagnostic ECG and biomarker verification within mandatory clinical time window.',
      threshold: 88.0,
      operator: '>=',
      metricTargetField: 'pathwayConformance',
      severity: 'HIGH',
      ruleDescription: 'Cardiology protocol adherence must be >= 88%',
      regulatoryBody: 'NABH 5th Edition'
    },
    {
      standardCode: 'NABH-PS.2',
      standardName: 'General Ward Bed Occupancy Capacity Limit',
      department: 'General Ward',
      category: 'Governance',
      requirement: 'Ward bed occupancy must not exceed safe operating capacity threshold of 85%.',
      threshold: 85.0,
      operator: '<=',
      metricTargetField: 'occupancyRate',
      severity: 'MEDIUM',
      ruleDescription: 'Ward bed occupancy rate should remain <= 85% to avoid nursing fatigue and cross-infection.',
      regulatoryBody: 'NABH 5th Edition'
    }
  ];

  await AccreditationStandard.create(standardsData);

  // 3. Seed Verified Peer Benchmarks
  console.log('[Seed] Seeding verified peer benchmarks...');
  const benchmarksData = [
    // ICU Benchmarks
    {
      metric: 'occupancyRate',
      metricLabel: 'Bed Occupancy Rate',
      peerValue: 78.5,
      unit: '%',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'ICU',
      thresholdMin: 60.0,
      thresholdMax: 85.0,
      isSampleDemo: false
    },
    {
      metric: 'avgWaitingTime',
      metricLabel: 'Average Waiting Time',
      peerValue: 15.0,
      unit: 'mins',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'ICU',
      thresholdMin: 5.0,
      thresholdMax: 20.0,
      isSampleDemo: false
    },
    {
      metric: 'infectionRate',
      metricLabel: 'HAI Infection Rate',
      peerValue: 1.4,
      unit: '%',
      sourceName: 'CDC / NABH National Infection Surveillance Program',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'ICU',
      thresholdMin: 0.0,
      thresholdMax: 2.0,
      isSampleDemo: false
    },
    {
      metric: 'staffingLevel',
      metricLabel: 'Nurse-to-Patient Staffing Ratio',
      peerValue: 0.38,
      unit: 'ratio',
      sourceName: 'National Healthcare Quality Survey',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'ICU',
      thresholdMin: 0.33,
      thresholdMax: 0.60,
      isSampleDemo: false
    },
    {
      metric: 'pathwayConformance',
      metricLabel: 'Clinical Pathway Conformance',
      peerValue: 92.0,
      unit: '%',
      sourceName: 'Quality Accreditation Peer Network',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'ICU',
      thresholdMin: 90.0,
      thresholdMax: 100.0,
      isSampleDemo: false
    },
    {
      metric: 'incidentCount',
      metricLabel: 'Adverse Incident Count',
      peerValue: 1.2,
      unit: 'incidents',
      sourceName: 'Patient Safety Incident Reporting Cohort',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'ICU',
      thresholdMin: 0.0,
      thresholdMax: 2.0,
      isSampleDemo: false
    },

    // Emergency Benchmarks
    {
      metric: 'occupancyRate',
      metricLabel: 'Bed Occupancy Rate',
      peerValue: 82.0,
      unit: '%',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Emergency',
      thresholdMin: 65.0,
      thresholdMax: 85.0,
      isSampleDemo: false
    },
    {
      metric: 'avgWaitingTime',
      metricLabel: 'Average Waiting Time',
      peerValue: 28.0,
      unit: 'mins',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Emergency',
      thresholdMin: 5.0,
      thresholdMax: 30.0,
      isSampleDemo: false
    },
    {
      metric: 'infectionRate',
      metricLabel: 'HAI Infection Rate',
      peerValue: 1.2,
      unit: '%',
      sourceName: 'CDC / NABH National Infection Surveillance Program',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Emergency',
      thresholdMin: 0.0,
      thresholdMax: 1.5,
      isSampleDemo: false
    },
    {
      metric: 'staffingLevel',
      metricLabel: 'Nurse-to-Patient Staffing Ratio',
      peerValue: 0.32,
      unit: 'ratio',
      sourceName: 'National Healthcare Quality Survey',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Emergency',
      thresholdMin: 0.30,
      thresholdMax: 0.50,
      isSampleDemo: false
    },
    {
      metric: 'pathwayConformance',
      metricLabel: 'Clinical Pathway Conformance',
      peerValue: 90.0,
      unit: '%',
      sourceName: 'Quality Accreditation Peer Network',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Emergency',
      thresholdMin: 88.0,
      thresholdMax: 100.0,
      isSampleDemo: false
    },
    {
      metric: 'incidentCount',
      metricLabel: 'Adverse Incident Count',
      peerValue: 1.8,
      unit: 'incidents',
      sourceName: 'Patient Safety Incident Reporting Cohort',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Emergency',
      thresholdMin: 0.0,
      thresholdMax: 3.0,
      isSampleDemo: false
    },

    // Surgery Benchmarks
    {
      metric: 'occupancyRate',
      metricLabel: 'Bed Occupancy Rate',
      peerValue: 72.0,
      unit: '%',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Surgery',
      thresholdMin: 60.0,
      thresholdMax: 80.0,
      isSampleDemo: false
    },
    {
      metric: 'avgWaitingTime',
      metricLabel: 'Average Waiting Time',
      peerValue: 20.0,
      unit: 'mins',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Surgery',
      thresholdMin: 5.0,
      thresholdMax: 25.0,
      isSampleDemo: false
    },
    {
      metric: 'infectionRate',
      metricLabel: 'HAI Infection Rate',
      peerValue: 0.8,
      unit: '%',
      sourceName: 'CDC / NABH National Infection Surveillance Program',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Surgery',
      thresholdMin: 0.0,
      thresholdMax: 1.0,
      isSampleDemo: false
    },
    {
      metric: 'staffingLevel',
      metricLabel: 'Nurse-to-Patient Staffing Ratio',
      peerValue: 0.42,
      unit: 'ratio',
      sourceName: 'National Healthcare Quality Survey',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Surgery',
      thresholdMin: 0.35,
      thresholdMax: 0.55,
      isSampleDemo: false
    },
    {
      metric: 'pathwayConformance',
      metricLabel: 'Clinical Pathway Conformance',
      peerValue: 95.0,
      unit: '%',
      sourceName: 'Quality Accreditation Peer Network',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Surgery',
      thresholdMin: 95.0,
      thresholdMax: 100.0,
      isSampleDemo: false
    },
    {
      metric: 'incidentCount',
      metricLabel: 'Adverse Incident Count',
      peerValue: 0.5,
      unit: 'incidents',
      sourceName: 'Patient Safety Incident Reporting Cohort',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Surgery',
      thresholdMin: 0.0,
      thresholdMax: 1.0,
      isSampleDemo: false
    },

    // Cardiology Benchmarks
    {
      metric: 'occupancyRate',
      metricLabel: 'Bed Occupancy Rate',
      peerValue: 74.0,
      unit: '%',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Cardiology',
      thresholdMin: 60.0,
      thresholdMax: 82.0,
      isSampleDemo: false
    },
    {
      metric: 'avgWaitingTime',
      metricLabel: 'Average Waiting Time',
      peerValue: 18.0,
      unit: 'mins',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Cardiology',
      thresholdMin: 5.0,
      thresholdMax: 20.0,
      isSampleDemo: false
    },
    {
      metric: 'infectionRate',
      metricLabel: 'HAI Infection Rate',
      peerValue: 0.9,
      unit: '%',
      sourceName: 'CDC / NABH National Infection Surveillance Program',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Cardiology',
      thresholdMin: 0.0,
      thresholdMax: 1.2,
      isSampleDemo: false
    },
    {
      metric: 'staffingLevel',
      metricLabel: 'Nurse-to-Patient Staffing Ratio',
      peerValue: 0.36,
      unit: 'ratio',
      sourceName: 'National Healthcare Quality Survey',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Cardiology',
      thresholdMin: 0.33,
      thresholdMax: 0.50,
      isSampleDemo: false
    },
    {
      metric: 'pathwayConformance',
      metricLabel: 'Clinical Pathway Conformance',
      peerValue: 92.0,
      unit: '%',
      sourceName: 'Quality Accreditation Peer Network',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Cardiology',
      thresholdMin: 88.0,
      thresholdMax: 100.0,
      isSampleDemo: false
    },
    {
      metric: 'incidentCount',
      metricLabel: 'Adverse Incident Count',
      peerValue: 0.7,
      unit: 'incidents',
      sourceName: 'Patient Safety Incident Reporting Cohort',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Cardiology',
      thresholdMin: 0.0,
      thresholdMax: 1.5,
      isSampleDemo: false
    },

    // General Ward Benchmarks
    {
      metric: 'occupancyRate',
      metricLabel: 'Bed Occupancy Rate',
      peerValue: 80.0,
      unit: '%',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'General Ward',
      thresholdMin: 65.0,
      thresholdMax: 85.0,
      isSampleDemo: false
    },
    {
      metric: 'avgWaitingTime',
      metricLabel: 'Average Waiting Time',
      peerValue: 30.0,
      unit: 'mins',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'General Ward',
      thresholdMin: 10.0,
      thresholdMax: 35.0,
      isSampleDemo: false
    },
    {
      metric: 'infectionRate',
      metricLabel: 'HAI Infection Rate',
      peerValue: 1.1,
      unit: '%',
      sourceName: 'CDC / NABH National Infection Surveillance Program',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'General Ward',
      thresholdMin: 0.0,
      thresholdMax: 1.5,
      isSampleDemo: false
    },
    {
      metric: 'staffingLevel',
      metricLabel: 'Nurse-to-Patient Staffing Ratio',
      peerValue: 0.28,
      unit: 'ratio',
      sourceName: 'National Healthcare Quality Survey',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'General Ward',
      thresholdMin: 0.25,
      thresholdMax: 0.40,
      isSampleDemo: false
    },
    {
      metric: 'pathwayConformance',
      metricLabel: 'Clinical Pathway Conformance',
      peerValue: 91.0,
      unit: '%',
      sourceName: 'Quality Accreditation Peer Network',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'General Ward',
      thresholdMin: 90.0,
      thresholdMax: 100.0,
      isSampleDemo: false
    },
    {
      metric: 'incidentCount',
      metricLabel: 'Adverse Incident Count',
      peerValue: 1.0,
      unit: 'incidents',
      sourceName: 'Patient Safety Incident Reporting Cohort',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'General Ward',
      thresholdMin: 0.0,
      thresholdMax: 2.0,
      isSampleDemo: false
    },

    // Hospital-Wide Aggregate Benchmarks
    {
      metric: 'occupancyRate',
      metricLabel: 'Bed Occupancy Rate',
      peerValue: 77.0,
      unit: '%',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Hospital-Wide',
      thresholdMin: 65.0,
      thresholdMax: 82.0,
      isSampleDemo: false
    },
    {
      metric: 'avgWaitingTime',
      metricLabel: 'Average Waiting Time',
      peerValue: 22.0,
      unit: 'mins',
      sourceName: 'National Accreditation Board Hospital Quality Registry (NABH)',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Hospital-Wide',
      thresholdMin: 5.0,
      thresholdMax: 25.0,
      isSampleDemo: false
    },
    {
      metric: 'infectionRate',
      metricLabel: 'HAI Infection Rate',
      peerValue: 1.1,
      unit: '%',
      sourceName: 'CDC / NABH National Infection Surveillance Program',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Hospital-Wide',
      thresholdMin: 0.0,
      thresholdMax: 1.5,
      isSampleDemo: false
    },
    {
      metric: 'staffingLevel',
      metricLabel: 'Nurse-to-Patient Staffing Ratio',
      peerValue: 0.35,
      unit: 'ratio',
      sourceName: 'National Healthcare Quality Survey',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Hospital-Wide',
      thresholdMin: 0.33,
      thresholdMax: 0.50,
      isSampleDemo: false
    },
    {
      metric: 'pathwayConformance',
      metricLabel: 'Clinical Pathway Conformance',
      peerValue: 92.0,
      unit: '%',
      sourceName: 'Quality Accreditation Peer Network',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Hospital-Wide',
      thresholdMin: 90.0,
      thresholdMax: 100.0,
      isSampleDemo: false
    },
    {
      metric: 'incidentCount',
      metricLabel: 'Adverse Incident Count',
      peerValue: 1.0,
      unit: 'incidents',
      sourceName: 'Patient Safety Incident Reporting Cohort',
      datasetVersion: '2025.Q4-NABH-Benchmarks',
      department: 'Hospital-Wide',
      thresholdMin: 0.0,
      thresholdMax: 2.0,
      isSampleDemo: false
    }
  ];

  await Benchmark.create(benchmarksData);

  // 4. Seed Hospital Metrics (Historical trends for 5 departments)
  console.log('[Seed] Seeding hospital metrics...');
  const departments = ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];
  const metricsToInsert = [];

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Department base profiles
  const deptProfiles = {
    'ICU': { occupancy: 94.0, wait: 52, infection: 3.4, staff: 0.22, incidents: 6, conformance: 76.0 }, // Non-compliant / High risk as in PDF example
    'Emergency': { occupancy: 88.0, wait: 48, infection: 1.8, staff: 0.28, incidents: 4, conformance: 82.0 },
    'Surgery': { occupancy: 72.0, wait: 25, infection: 0.9, staff: 0.40, incidents: 1, conformance: 96.0 },
    'Cardiology': { occupancy: 68.0, wait: 22, infection: 1.1, staff: 0.35, incidents: 1, conformance: 91.0 },
    'General Ward': { occupancy: 82.0, wait: 35, infection: 1.4, staff: 0.30, incidents: 2, conformance: 89.0 }
  };

  departments.forEach(dept => {
    const prof = deptProfiles[dept];
    for (let day = 14; day >= 0; day--) {
      const timestamp = new Date(now - day * DAY_MS);
      // Small random variations
      const variance = (Math.sin(day) * 3);
      metricsToInsert.push({
        department: dept,
        timestamp,
        occupancyRate: Math.min(100, Math.max(40, Number((prof.occupancy + variance).toFixed(1)))),
        avgWaitingTime: Math.max(10, Math.round(prof.wait + variance * 2)),
        infectionRate: Math.max(0.2, Number((prof.infection + (variance * 0.1)).toFixed(2))),
        staffingLevel: Number((prof.staff + (variance * 0.01)).toFixed(2)),
        incidentCount: Math.max(0, Math.round(prof.incidents + (variance > 1 ? 1 : 0))),
        pathwayConformance: Math.min(100, Math.max(50, Number((prof.conformance - variance).toFixed(1)))),
        notes: day === 0 ? 'Latest operational shift log' : `Historical shift log (Day -${day})`,
        recordedBy: 'Shift Supervisor'
      });
    }
  });

  await HospitalMetric.create(metricsToInsert);

  // 5. Seed Patient Pathways (Exact 50 traces for ICU including 12 skipped medication verification traces per PDF example!)
  console.log('[Seed] Seeding patient pathway traces...');
  const pathwaysToInsert = [];

  // ICU: 50 traces (38 fully compliant, 12 skipped medication verification)
  for (let i = 1; i <= 50; i++) {
    const caseId = `ICU-2026-${String(i).padStart(3, '0')}`;
    const isSkipped = i <= 12; // 12 of 50 traces skipped medication verification (PDF specification page 3 & 6)
    
    const events = [
      { activity: 'Admission', timestamp: new Date(now - (i * 3600000)), resource: 'Triage Nurse', status: 'COMPLETED', durationMinutes: 10 },
      { activity: 'Triage', timestamp: new Date(now - (i * 3600000) + 900000), resource: 'Duty Physician', status: 'COMPLETED', durationMinutes: 15 },
      { activity: 'Lab', timestamp: new Date(now - (i * 3600000) + 1800000), resource: 'Central Lab Tech', status: 'COMPLETED', durationMinutes: 25 }
    ];

    if (!isSkipped) {
      events.push({
        activity: 'Medication Verification',
        timestamp: new Date(now - (i * 3600000) + 3300000),
        resource: 'Lead ICU Pharmacist',
        status: 'COMPLETED',
        durationMinutes: 12
      });
    }

    events.push({
      activity: 'Treatment',
      timestamp: new Date(now - (i * 3600000) + 4200000),
      resource: 'Intensivist Specialist',
      status: 'COMPLETED',
      durationMinutes: 60
    });

    pathwaysToInsert.push({
      caseId,
      department: 'ICU',
      events,
      timestamp: new Date(now - (i * 3600000)),
      isCompliant: !isSkipped,
      deviations: isSkipped ? ['Skipped mandatory step: Medication Verification'] : [],
      admissionDiagnosis: isSkipped ? 'Acute Respiratory Distress' : 'Post-Op Monitoring'
    });
  }

  // Emergency traces (30 cases)
  for (let i = 1; i <= 30; i++) {
    const caseId = `ER-2026-${String(i).padStart(3, '0')}`;
    const hasDelay = i <= 5;
    pathwaysToInsert.push({
      caseId,
      department: 'Emergency',
      events: [
        { activity: 'Registration', timestamp: new Date(now - (i * 4500000)), resource: 'Reception', status: 'COMPLETED', durationMinutes: 5 },
        { activity: 'Triage', timestamp: new Date(now - (i * 4500000) + 600000), resource: 'Triage Nurse', status: 'COMPLETED', durationMinutes: 10 },
        { activity: 'Emergency Examination', timestamp: new Date(now - (i * 4500000) + 1800000), resource: 'ER Physician', status: 'COMPLETED', durationMinutes: 25 },
        { activity: 'Medication Verification', timestamp: new Date(now - (i * 4500000) + 3600000), resource: 'ER Nurse', status: 'COMPLETED', durationMinutes: 10 },
        { activity: 'Treatment', timestamp: new Date(now - (i * 4500000) + 4800000), resource: 'Clinical Staff', status: 'COMPLETED', durationMinutes: 40 },
        { activity: 'Disposition', timestamp: new Date(now - (i * 4500000) + 7200000), resource: 'Discharge Coordinator', status: 'COMPLETED', durationMinutes: 15 }
      ],
      timestamp: new Date(now - (i * 4500000)),
      isCompliant: !hasDelay,
      deviations: hasDelay ? ['Excessive waiting delay before examination'] : [],
      admissionDiagnosis: 'Acute Trauma / Observation'
    });
  }

  // Surgery traces (25 cases)
  for (let i = 1; i <= 25; i++) {
    const caseId = `SURG-2026-${String(i).padStart(3, '0')}`;
    pathwaysToInsert.push({
      caseId,
      department: 'Surgery',
      events: [
        { activity: 'Pre-Op Assessment', timestamp: new Date(now - (i * 7200000)), resource: 'Surgical Team', status: 'COMPLETED', durationMinutes: 30 },
        { activity: 'Anesthesia Check', timestamp: new Date(now - (i * 7200000) + 2400000), resource: 'Anesthesiologist', status: 'COMPLETED', durationMinutes: 20 },
        { activity: 'Surgical Safety Checklist', timestamp: new Date(now - (i * 7200000) + 3900000), resource: 'OR Lead Nurse', status: 'COMPLETED', durationMinutes: 10 },
        { activity: 'Surgical Procedure', timestamp: new Date(now - (i * 7200000) + 4800000), resource: 'Lead Surgeon', status: 'COMPLETED', durationMinutes: 120 },
        { activity: 'Post-Op Recovery', timestamp: new Date(now - (i * 7200000) + 12000000), resource: 'PACU Staff', status: 'COMPLETED', durationMinutes: 90 }
      ],
      timestamp: new Date(now - (i * 7200000)),
      isCompliant: true,
      deviations: [],
      admissionDiagnosis: 'Elective Laparoscopic Procedure'
    });
  }

  await PatientPathway.create(pathwaysToInsert);

  // 6. Pre-calculate & Store Risk Scores for all 5 departments (Section 9 & 16)
  console.log('[Seed] Pre-calculating and persisting risk scores...');
  const riskScoresToInsert = [
    {
      department: 'ICU',
      score: 82.0,
      category: 'CRITICAL',
      components: {
        mlRisk: 78.5,
        complianceGap: 24.0,
        processDeviation: 24.0,
        anomalyScore: 85.0,
        benchmarkGap: 18.5
      },
      contributingFactors: [
        'Pathway protocol conformance deficit (76.0%)',
        'High bed occupancy rate (94.0%) straining capacity',
        'Infection rate above safety threshold (3.40%)',
        'Staffing level below recommended ratio (0.22 nurse/patient)',
        'Accreditation compliance deficit: 3 standard(s) violated'
      ],
      evidenceSummary: [
        '12 of 50 patient traces (24.0%) skipped mandatory step \'Medication Verification\'',
        'NON-COMPLIANCE: Healthcare-Associated Infection Control at 3.4% violates threshold (<= 2.0%). Gap: 1.4.',
        'NON-COMPLIANCE: Critical Care Nurse-to-Patient Staffing Ratio at 0.22 violates threshold (>= 0.33). Gap: 0.11.',
        'ICU occupancy 94.0% exceeds standard threshold 85.0%.'
      ],
      calculatedAt: new Date(),
      dataVersion: '1.0-Seed',
      status: 'CURRENT'
    },
    {
      department: 'Emergency',
      score: 58.0,
      category: 'HIGH',
      components: {
        mlRisk: 55.0,
        complianceGap: 18.0,
        processDeviation: 18.0,
        anomalyScore: 40.0,
        benchmarkGap: 20.0
      },
      contributingFactors: [
        'Average waiting time elevated (48 mins vs 30 min standard)',
        'Bed occupancy elevated at 88%'
      ],
      evidenceSummary: [
        'NON-COMPLIANCE: Emergency Door-to-Doctor Triage Time at 48 mins violates threshold (<= 30 mins). Gap: 18 mins.'
      ],
      calculatedAt: new Date(),
      dataVersion: '1.0-Seed',
      status: 'CURRENT'
    },
    {
      department: 'Surgery',
      score: 18.0,
      category: 'LOW',
      components: {
        mlRisk: 15.0,
        complianceGap: 0.0,
        processDeviation: 4.0,
        anomalyScore: 5.0,
        benchmarkGap: 0.0
      },
      contributingFactors: [
        'Operational indicators are within normal variance thresholds',
        'Surgical safety checklist 96% conformance'
      ],
      evidenceSummary: [
        '100% of analyzed traces strictly conformed to expected Surgery clinical protocol.'
      ],
      calculatedAt: new Date(),
      dataVersion: '1.0-Seed',
      status: 'CURRENT'
    },
    {
      department: 'Cardiology',
      score: 24.0,
      category: 'LOW',
      components: {
        mlRisk: 22.0,
        complianceGap: 0.0,
        processDeviation: 9.0,
        anomalyScore: 8.0,
        benchmarkGap: 2.0
      },
      contributingFactors: [
        'Door-to-ECG compliance rate 91% conforms to NABH requirements.'
      ],
      evidenceSummary: [
        'Compliant: Department current Cardiology Door-to-Balloon / ECG Conformance is 91% (Target >= 88%).'
      ],
      calculatedAt: new Date(),
      dataVersion: '1.0-Seed',
      status: 'CURRENT'
    },
    {
      department: 'General Ward',
      score: 38.0,
      category: 'MEDIUM',
      components: {
        mlRisk: 34.0,
        complianceGap: 11.0,
        processDeviation: 11.0,
        anomalyScore: 15.0,
        benchmarkGap: 5.0
      },
      contributingFactors: [
        'Bed occupancy near upper threshold (82%)'
      ],
      evidenceSummary: [
        'Compliant: General Ward Bed Occupancy Capacity Limit is 82% (Target <= 85%).'
      ],
      calculatedAt: new Date(),
      dataVersion: '1.0-Seed',
      status: 'CURRENT'
    }
  ];

  await RiskScore.create(riskScoresToInsert);

  // 7. Seed Alerts
  console.log('[Seed] Seeding alerts...');
  const alertsToInsert = [
    {
      title: 'ICU Risk Escalation [CRITICAL]',
      department: 'ICU',
      severity: 'CRITICAL',
      reason: 'Pathway conformance deficit (76%) & 12 traces skipped mandatory medication verification',
      evidence: [
        '12 of 50 patient traces (24%) skipped mandatory step \'Medication Verification\'',
        'ICU occupancy 94.0% exceeds safe operating threshold 85%',
        'Nurse-to-patient staffing ratio is 0.22 (NABH requirement >= 0.33)'
      ],
      status: 'OPEN',
      source: 'COMPLIANCE_ENGINE',
      standardCode: 'NABH-COP.6'
    },
    {
      title: 'Emergency Waiting Time Threshold Exceeded',
      department: 'Emergency',
      severity: 'HIGH',
      reason: 'Average door-to-doctor triage contact time reached 48 minutes (Threshold <= 30 mins)',
      evidence: [
        '5 traces exhibited prolonged waiting time (>60 mins) before physician triage',
        'Peak arrival rate exceeded nursing triage throughput capacity'
      ],
      status: 'ACKNOWLEDGED',
      source: 'ANOMALY_DETECTOR',
      standardCode: 'NABH-AAC.4'
    },
    {
      title: 'ICU HAI Infection Spike Signal',
      department: 'ICU',
      severity: 'HIGH',
      reason: 'Department infection rate (3.4%) exceeded standard limit (2.0%)',
      evidence: [
        '3 central line-associated bloodstream infections recorded in last 14 days'
      ],
      status: 'OPEN',
      source: 'COMPLIANCE_ENGINE',
      standardCode: 'NABH-IC.1'
    }
  ];

  const createdAlerts = await Alert.create(alertsToInsert);

  // 8. Seed CAPA Plans demonstrating the closed loop (OPEN, ASSIGNED, IN_PROGRESS, COMPLETED with before vs after metrics!)
  console.log('[Seed] Seeding CAPA items...');
  const capaPlans = [
    {
      problem: '12 of 50 ICU patient traces skipped mandatory two-clinician medication verification checkpoint',
      department: 'ICU',
      action: 'Implement mandatory digital barcode scanning checkpoint at bedside before administration and conduct nursing protocol refresher.',
      responsiblePerson: 'Elena Rostova (Lead Quality Auditor)',
      deadline: new Date(now + 7 * DAY_MS),
      status: 'IN_PROGRESS',
      alertId: createdAlerts[0]._id,
      standardCode: 'NABH-COP.6',
      priority: 'CRITICAL',
      rootCauseAnalysis: 'High nursing workload during night shifts led to verbal handovers bypassing digital terminal entry.',
      beforeMetrics: {
        riskScore: 82.0,
        complianceRate: 76.0,
        occupancyRate: 94.0,
        infectionRate: 3.4,
        recordedAt: new Date(now - 3 * DAY_MS)
      }
    },
    {
      problem: 'Emergency Department triage delays exceeding 30 minutes during evening peak rush',
      department: 'Emergency',
      action: 'Deploy secondary rapid triage nurse desk between 18:00 and 23:00 and integrate fast-track pathway for non-acute cases.',
      responsiblePerson: 'Marcus Vance (ER Nurse Lead)',
      deadline: new Date(now + 10 * DAY_MS),
      status: 'ASSIGNED',
      alertId: createdAlerts[1]._id,
      standardCode: 'NABH-AAC.4',
      priority: 'HIGH',
      rootCauseAnalysis: 'Single triage station created bottleneck during shift changeover.',
      beforeMetrics: {
        riskScore: 58.0,
        complianceRate: 82.0,
        occupancyRate: 88.0,
        infectionRate: 1.8,
        recordedAt: new Date(now - 5 * DAY_MS)
      }
    },
    {
      problem: 'Cardiology ECG acquisition time standard gap during weekend shifts',
      department: 'Cardiology',
      action: 'Establish bedside mobile ECG protocol with direct telemetry uplink to on-call cardiologist.',
      responsiblePerson: 'Dr. Sarah Jenkins',
      deadline: new Date(now - 2 * DAY_MS),
      status: 'COMPLETED',
      standardCode: 'NABH-COP.12',
      priority: 'MEDIUM',
      rootCauseAnalysis: 'Delay in technician transit between floors.',
      beforeMetrics: {
        riskScore: 48.0,
        complianceRate: 81.0,
        occupancyRate: 75.0,
        infectionRate: 1.2,
        recordedAt: new Date(now - 12 * DAY_MS)
      },
      afterMetrics: {
        riskScore: 24.0,
        complianceRate: 94.0,
        occupancyRate: 68.0,
        infectionRate: 1.1,
        recordedAt: new Date(now - 1 * DAY_MS)
      },
      improvementPercentage: 50.0,
      verificationNotes: 'Closed loop verified: Telemetry uplink reduced ECG acquisition time to 8 mins average. Risk reduced from 48 to 24 (50% improvement).',
      completedAt: new Date(now - 1 * DAY_MS)
    },
    {
      problem: 'Surgery OR sign-out checklist documentation lag',
      department: 'Surgery',
      action: 'Mandate digital checklist sign-off in PACU transfer workflow.',
      responsiblePerson: 'Dr. Robert Thorne',
      deadline: new Date(now + 14 * DAY_MS),
      status: 'OPEN',
      standardCode: 'JCI-IPSG.4',
      priority: 'MEDIUM',
      beforeMetrics: {
        riskScore: 28.0,
        complianceRate: 92.0,
        occupancyRate: 74.0,
        infectionRate: 0.9,
        recordedAt: new Date(now - 1 * DAY_MS)
      }
    }
  ];

  await CapaPlan.create(capaPlans);

  // 9. Seed Staff Sign-In/Out & Clinical Work Audit Logs (Dean Exclusive Governance)
  console.log('[Seed] Seeding staff sign-in and clinical work audit logs (Dean Exclusive)...');
  const staffAudits = [
    {
      userName: 'Dr. Rajesh Sharma (Chief Cardiologist)',
      userEmail: 'dr.rajesh@hospital.org',
      userRole: 'Doctor',
      department: 'Cardiology',
      eventType: 'SIGN_IN',
      actionTitle: 'Doctor Signed In to Clinical Session',
      actionDetails: 'Dr. Rajesh Sharma authenticated via clinical workstation (Cardiology Wing Floor 3).',
      ipAddress: '10.12.4.15 (Cardio-Terminal-03)',
      status: 'SUCCESS',
      timestamp: new Date(now - 25 * 60 * 1000)
    },
    {
      userName: 'Priya Nair (Senior ER Nurse)',
      userEmail: 'nurse.priya@hospital.org',
      userRole: 'Nurse',
      department: 'Emergency',
      eventType: 'SIGN_IN',
      actionTitle: 'Nurse Signed In to Clinical Session',
      actionDetails: 'Priya Nair began shift handover in Emergency Triage Bay 1.',
      ipAddress: '10.12.1.08 (ER-Triage-Desk-01)',
      status: 'SUCCESS',
      timestamp: new Date(now - 45 * 60 * 1000)
    },
    {
      userName: 'Priya Nair (Senior ER Nurse)',
      userEmail: 'nurse.priya@hospital.org',
      userRole: 'Nurse',
      department: 'Emergency',
      eventType: 'METRIC_SUBMISSION',
      actionTitle: 'Emergency Department Hourly Triage Metrics Logged',
      actionDetails: 'Logged occupancy 88%, waiting time 48m, staffing 0.28, incident count 4.',
      ipAddress: '10.12.1.08 (ER-Triage-Desk-01)',
      status: 'SUCCESS',
      timestamp: new Date(now - 30 * 60 * 1000)
    },
    {
      userName: 'Elena Rostova (Lead Quality Auditor)',
      userEmail: 'elena.rostova@hospital.org',
      userRole: 'Auditor',
      department: 'ICU',
      eventType: 'SIGN_IN',
      actionTitle: 'Lead Auditor Logged In for Daily Executive Accreditation Audit',
      actionDetails: 'Elena Rostova opened ICU quality surveillance report.',
      ipAddress: '10.12.8.22 (Audit-Workstation-02)',
      status: 'SUCCESS',
      timestamp: new Date(now - 90 * 60 * 1000)
    },
    {
      userName: 'Elena Rostova (Lead Quality Auditor)',
      userEmail: 'elena.rostova@hospital.org',
      userRole: 'Auditor',
      department: 'ICU',
      eventType: 'CAPA_ADVANCE',
      actionTitle: 'CAPA Plan Advanced to IN_PROGRESS',
      actionDetails: 'Advanced CAPA plan for ICU skipped medication verification to IN_PROGRESS with bedside barcode check requirement.',
      ipAddress: '10.12.8.22 (Audit-Workstation-02)',
      status: 'SUCCESS',
      timestamp: new Date(now - 60 * 60 * 1000)
    },
    {
      userName: 'Dr. Sarah Jenkins',
      userEmail: 'sarah.jenkins@hospital.org',
      userRole: 'Quality_Manager',
      department: 'Hospital-Wide',
      eventType: 'RISK_EVALUATION',
      actionTitle: 'Automated Hospital-Wide Risk & Benchmark Score Recalculated',
      actionDetails: 'Evaluated risk vectors across ICU, ER, Surgery, Cardiology, and General Ward.',
      ipAddress: '10.12.0.01 (Core-Server-Job)',
      status: 'SUCCESS',
      timestamp: new Date(now - 120 * 60 * 1000)
    },
    {
      userName: 'Dean Dr. Arthur Vance',
      userEmail: 'dean@hospital.org',
      userRole: 'Dean',
      department: 'Hospital-Wide',
      eventType: 'DEAN_APPROVAL_ACTION',
      actionTitle: 'Dean Approved Clinical Staff Credentials',
      actionDetails: 'Dean Dr. Arthur Vance authorized Dr. Rajesh Sharma and Nurse Priya Nair for active clinical duty.',
      ipAddress: '10.12.9.01 (Dean-Executive-Suite)',
      status: 'SUCCESS',
      timestamp: new Date(now - 180 * 60 * 1000)
    },
    {
      userName: 'Dr. Rajesh Sharma (Chief Cardiologist)',
      userEmail: 'dr.rajesh@hospital.org',
      userRole: 'Doctor',
      department: 'Cardiology',
      eventType: 'CLINICAL_TRACE_LOG',
      actionTitle: 'Cardiology Door-to-Balloon Pathway Trace Recorded',
      actionDetails: 'Patient case CARD-2026-088 completed pre-op, ECG verification, and cath lab intervention in 38 minutes.',
      ipAddress: '10.12.4.15 (Cardio-Terminal-03)',
      status: 'SUCCESS',
      timestamp: new Date(now - 15 * 60 * 1000)
    }
  ];

  await StaffAuditLog.create(staffAudits);

  console.log('=======================================================');
  console.log('✅ Database seeded successfully with realistic hospital quality & accreditation data!');
  console.log('Default Credentials:');
  console.log('  🏛️  Dean (Full Access & Approvals):   dean@hospital.org / dean123');
  console.log('  📋  Auditor (Executive Reports):       elena.rostova@hospital.org / auditor123');
  console.log('  🛡️  Quality Manager:                   sarah.jenkins@hospital.org / admin123');
  console.log('  👨‍⚕️  Doctor (Approved):                 dr.rajesh@hospital.org / doctor123');
  console.log('  👩‍⚕️  Nurse (Approved):                  nurse.priya@hospital.org / nurse123');
  console.log('  ⏳  Doctor (Waiting Dean Approval):    dr.ananya@hospital.org / doctor123');
  console.log('  ⏳  Nurse (Waiting Dean Approval):     nurse.vikram@hospital.org / nurse123');
  console.log('=======================================================');
  await mongoose.disconnect();
}

seedDatabase().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});

