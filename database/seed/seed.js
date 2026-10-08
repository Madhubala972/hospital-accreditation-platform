const path = require('path');
const crypto = require('crypto');
const backendNodeModules = path.resolve(__dirname, '../../backend/node_modules');
const mongoose = require(path.join(backendNodeModules, 'mongoose'));
const bcrypt = require(path.join(backendNodeModules, 'bcryptjs'));

const User = require('../../backend/models/User');
const HospitalMetric = require('../../backend/models/HospitalMetric');
const PatientPathway = require('../../backend/models/PatientPathway');
const AccreditationStandard = require('../../backend/models/AccreditationStandard');
const AccreditationEvidence = require('../../backend/models/AccreditationEvidence');
const RiskScore = require('../../backend/models/RiskScore');
const Alert = require('../../backend/models/Alert');
const CapaPlan = require('../../backend/models/CapaPlan');
const Benchmark = require('../../backend/models/Benchmark');
const StaffAuditLog = require('../../backend/models/StaffAuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_accreditation';

function computeHash(payload, previousHash = 'GENESIS_HASH_00000000000000000000000000000000') {
  const normalized = typeof payload === 'object' 
    ? JSON.stringify(payload, Object.keys(payload).sort()) 
    : String(payload);
  return crypto.createHash('sha256').update(`${previousHash}:${normalized}`).digest('hex');
}

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

  // 2. Seed Accreditation Standards
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
      regulatoryBody: 'NABH 5th Edition',
      evidenceRequirements: 'Patient pathway trace + two-clinician digital barcode medication verification log',
      requiredEvidenceTypes: ['PATHWAY_TRACE', 'METRIC', 'CLINICAL_VERIFICATION']
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
      regulatoryBody: 'NABH 5th Edition',
      evidenceRequirements: 'Infection surveillance clinical lab culture records and HAI rate telemetry',
      requiredEvidenceTypes: ['METRIC', 'INCIDENT']
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
      regulatoryBody: 'NABH 5th Edition',
      evidenceRequirements: 'Biometric shift clock-in logs and patient assignment sheets',
      requiredEvidenceTypes: ['METRIC', 'AUDIT_OBSERVATION']
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
      regulatoryBody: 'NABH 5th Edition',
      evidenceRequirements: 'EHR door-to-doctor electronic timestamp logs and triage acuity recordings',
      requiredEvidenceTypes: ['PATHWAY_TRACE', 'METRIC']
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
      regulatoryBody: 'JCI International Patient Safety',
      evidenceRequirements: 'Operating theatre digital sign-off log for Sign-in, Time-out, and Sign-out checkpoints',
      requiredEvidenceTypes: ['PATHWAY_TRACE', 'CLINICAL_VERIFICATION']
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
      regulatoryBody: 'NABH 5th Edition',
      evidenceRequirements: 'Telemetry transmission logs and cath lab activation timestamps',
      requiredEvidenceTypes: ['PATHWAY_TRACE', 'METRIC']
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
      regulatoryBody: 'NABH 5th Edition',
      evidenceRequirements: 'Census telemetry records and bed management admission logs',
      requiredEvidenceTypes: ['METRIC']
    }
  ];

  await AccreditationStandard.create(standardsData);

  // 3. Seed Benchmarks
  console.log('[Seed] Seeding verified peer benchmarks...');
  const benchmarksData = [
    { metric: 'occupancyRate', metricLabel: 'Bed Occupancy Rate', peerValue: 78.5, unit: '%', sourceName: 'NABH Quality Registry', datasetVersion: '2025.Q4', department: 'ICU', thresholdMin: 60.0, thresholdMax: 85.0 },
    { metric: 'avgWaitingTime', metricLabel: 'Average Waiting Time', peerValue: 15.0, unit: 'mins', sourceName: 'NABH Quality Registry', datasetVersion: '2025.Q4', department: 'ICU', thresholdMin: 5.0, thresholdMax: 20.0 },
    { metric: 'infectionRate', metricLabel: 'HAI Infection Rate', peerValue: 1.4, unit: '%', sourceName: 'CDC Surveillance', datasetVersion: '2025.Q4', department: 'ICU', thresholdMin: 0.0, thresholdMax: 2.0 },
    { metric: 'staffingLevel', metricLabel: 'Nurse-to-Patient Staffing Ratio', peerValue: 0.38, unit: 'ratio', sourceName: 'National Healthcare Survey', datasetVersion: '2025.Q4', department: 'ICU', thresholdMin: 0.33, thresholdMax: 0.60 },
    { metric: 'pathwayConformance', metricLabel: 'Clinical Pathway Conformance', peerValue: 92.0, unit: '%', sourceName: 'Peer Network', datasetVersion: '2025.Q4', department: 'ICU', thresholdMin: 90.0, thresholdMax: 100.0 },
    { metric: 'occupancyRate', metricLabel: 'Bed Occupancy Rate', peerValue: 82.0, unit: '%', sourceName: 'NABH Quality Registry', datasetVersion: '2025.Q4', department: 'Emergency', thresholdMin: 65.0, thresholdMax: 85.0 },
    { metric: 'avgWaitingTime', metricLabel: 'Average Waiting Time', peerValue: 28.0, unit: 'mins', sourceName: 'NABH Quality Registry', datasetVersion: '2025.Q4', department: 'Emergency', thresholdMin: 5.0, thresholdMax: 30.0 },
    { metric: 'infectionRate', metricLabel: 'HAI Infection Rate', peerValue: 1.2, unit: '%', sourceName: 'CDC Surveillance', datasetVersion: '2025.Q4', department: 'Emergency', thresholdMin: 0.0, thresholdMax: 1.5 },
    { metric: 'staffingLevel', metricLabel: 'Nurse-to-Patient Staffing Ratio', peerValue: 0.32, unit: 'ratio', sourceName: 'National Healthcare Survey', datasetVersion: '2025.Q4', department: 'Emergency', thresholdMin: 0.30, thresholdMax: 0.50 },
    { metric: 'pathwayConformance', metricLabel: 'Clinical Pathway Conformance', peerValue: 90.0, unit: '%', sourceName: 'Peer Network', datasetVersion: '2025.Q4', department: 'Emergency', thresholdMin: 88.0, thresholdMax: 100.0 }
  ];

  await Benchmark.create(benchmarksData);

  // 4. Generate 15 Days of Distinct Everyday Operational Data, Evidence Chains, Traces & Risk Scores!
  console.log('[Seed] Generating 15 days of distinct everyday operational metrics, cryptographic evidence chains, pathways, and risk scores...');

  const departments = ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Base patterns for each department with realistic historical trajectory
  // E.g., Day 14 was relatively normal; Day 10-7 saw an ICU infection spike; Day 5-3 had high occupancy; Today (Day 0) has 12 skipped medication verifications in ICU
  const deptBaseTrends = {
    'ICU': (day) => {
      // Day 0: non-compliant (76% conformance, 94% occupancy, 3.4% infection, 0.22 staffing)
      // Day 5: moderate (84% conformance, 89% occupancy, 2.5% infection, 0.28 staffing)
      // Day 10: high infection crisis (79% conformance, 96% occupancy, 4.1% infection, 0.20 staffing)
      // Day 14: compliant baseline (92% conformance, 80% occupancy, 1.6% infection, 0.34 staffing)
      const occupancy = Number((82 + Math.sin(day * 0.8) * 12 + (day < 4 ? 6 : 0)).toFixed(1));
      const wait = Math.round(35 + Math.sin(day * 0.5) * 18);
      const infection = Number((1.5 + Math.abs(Math.sin(day * 0.7) * 2.2) + (day === 0 ? 1.4 : 0)).toFixed(2));
      const staff = Number((0.34 - (occupancy > 90 ? 0.12 : (occupancy > 85 ? 0.06 : 0))).toFixed(2));
      const conformance = Number((92 - (day === 0 ? 16 : (day % 3 === 0 ? 12 : 4))).toFixed(1));
      const incidents = occupancy > 90 ? (infection > 3.0 ? 6 : 4) : 1;
      return { occupancy: Math.min(99, Math.max(60, occupancy)), wait, infection, staff: Math.max(0.18, staff), conformance, incidents };
    },
    'Emergency': (day) => {
      const occupancy = Number((78 + Math.cos(day * 0.9) * 10 + (day < 3 ? 8 : 0)).toFixed(1));
      const wait = Math.round(26 + (day % 2 === 0 ? 22 : 6));
      const infection = Number((1.0 + Math.sin(day * 0.4) * 0.7).toFixed(2));
      const staff = Number((0.32 + Math.cos(day) * 0.04).toFixed(2));
      const conformance = Number((91 - (wait > 40 ? 9 : 2)).toFixed(1));
      const incidents = wait > 40 ? 4 : 1;
      return { occupancy, wait, infection, staff, conformance, incidents };
    },
    'Surgery': (day) => {
      const occupancy = Number((70 + Math.sin(day) * 6).toFixed(1));
      const wait = Math.round(20 + Math.cos(day) * 5);
      const infection = Number((0.8 + Math.sin(day * 0.3) * 0.3).toFixed(2));
      const staff = Number((0.40 + Math.sin(day) * 0.03).toFixed(2));
      const conformance = Number((96 - (day === 6 ? 4 : 0)).toFixed(1));
      return { occupancy, wait, infection, staff, conformance, incidents: 1 };
    },
    'Cardiology': (day) => {
      const occupancy = Number((68 + Math.cos(day * 0.6) * 7).toFixed(1));
      const wait = Math.round(18 + Math.sin(day * 0.8) * 6);
      const infection = Number((0.9 + Math.cos(day * 0.5) * 0.3).toFixed(2));
      const staff = Number((0.36 + Math.sin(day) * 0.02).toFixed(2));
      const conformance = Number((91 + Math.sin(day) * 3).toFixed(1));
      return { occupancy, wait, infection, staff, conformance, incidents: 1 };
    },
    'General Ward': (day) => {
      const occupancy = Number((80 + Math.sin(day * 0.4) * 6).toFixed(1));
      const wait = Math.round(30 + Math.cos(day * 0.5) * 8);
      const infection = Number((1.2 + Math.sin(day * 0.6) * 0.3).toFixed(2));
      const staff = Number((0.29 + Math.cos(day) * 0.02).toFixed(2));
      const conformance = Number((89 + Math.sin(day) * 2).toFixed(1));
      return { occupancy, wait, infection, staff, conformance, incidents: 2 };
    }
  };

  const allMetricsToInsert = [];
  const allEvidenceToInsert = [];
  const allRiskScoresToInsert = [];
  const allPathwaysToInsert = [];
  let globalHashChain = 'GENESIS_HASH_00000000000000000000000000000000';
  let chainIndexCounter = 1;

  for (let day = 14; day >= 0; day--) {
    const dayDate = new Date(now - day * DAY_MS);
    const dStr = dayDate.toISOString().split('T')[0];
    const cleanDateFormatted = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const shiftNotes = day === 0
      ? 'Latest active operational quality log and accreditation surveillance audit.'
      : `Official daily accreditation quality log for ${cleanDateFormatted} (Shift Day -${day}).`;

    // Process each department for this day
    for (const dept of departments) {
      const trend = deptBaseTrends[dept](day);
      const dayEvId = `EV-${dept.substring(0, 3).toUpperCase()}-${dStr.replace(/-/g, '')}-01`;

      // 1. Create Evidence Record for this Day & Department
      const evidencePayload = {
        auditDate: dStr,
        department: dept,
        occupancyRate: trend.occupancy,
        avgWaitingTime: trend.wait,
        infectionRate: trend.infection,
        staffingLevel: trend.staff,
        pathwayConformance: trend.conformance,
        incidentCount: trend.incidents,
        shiftInspector: day === 0 ? 'Elena Rostova (Lead Quality Auditor)' : `Shift Supervisor (Day -${day})`
      };

      const evHash = computeHash(evidencePayload, globalHashChain);

      const standardCode = dept === 'ICU' 
        ? (trend.conformance < 90 ? 'NABH-COP.6' : (trend.infection > 2.0 ? 'NABH-IC.1' : 'NABH-HRM.3'))
        : (dept === 'Emergency' ? 'NABH-AAC.4' : (dept === 'Surgery' ? 'JCI-IPSG.4' : (dept === 'Cardiology' ? 'NABH-COP.12' : 'NABH-PS.2')));

      allEvidenceToInsert.push({
        evidenceId: dayEvId,
        department: dept,
        standardCode,
        evidenceType: 'METRIC',
        sourceType: 'HospitalMetric',
        sourceId: `METRIC-${dept}-${dStr}`,
        title: `${dept} Daily Quality & Protocol Verification Record (${cleanDateFormatted})`,
        description: `Verified operational telemetry for ${dept} on ${dStr}. Conformance: ${trend.conformance}%, Occupancy: ${trend.occupancy}%, Infection: ${trend.infection}%.`,
        dataPayload: evidencePayload,
        originalHash: evHash,
        currentHash: evHash,
        previousHash: globalHashChain,
        chainIndex: chainIndexCounter++,
        isCryptographicallySealed: true,
        verifiedBy: day === 0 ? 'Elena Rostova (Lead Quality Auditor)' : `Elena Rostova (Shift Quality Auditor)`,
        verifiedAt: dayDate,
        auditorNotes: day === 0 ? 'Physical audit and digital clinical log review completed. Cryptographically sealed.' : 'Automated surveillance audit verified by Lead Auditor.',
        recordedBy: day === 0 ? 'Elena Rostova' : `Shift Inspector (${dept})`,
        recordedAt: dayDate,
        integrityStatus: 'VERIFIED',
        verificationNotes: `SHA-256 cryptographic provenance anchored on ${dStr}.`,
        version: 1
      });

      globalHashChain = evHash;

      // 2. Create HospitalMetric for this Day & Department
      allMetricsToInsert.push({
        department: dept,
        timestamp: dayDate,
        occupancyRate: trend.occupancy,
        avgWaitingTime: trend.wait,
        infectionRate: trend.infection,
        staffingLevel: trend.staff,
        incidentCount: trend.incidents,
        pathwayConformance: trend.conformance,
        notes: shiftNotes,
        recordedBy: day === 0 ? 'Elena Rostova' : 'Shift Supervisor',
        evidenceId: dayEvId,
        verificationStatus: 'VERIFIED',
        integrityHash: evHash
      });

      // 3. Compute and Record RiskScore for this Day & Department
      let compGap = Math.max(0, 100 - trend.conformance);
      let occScore = trend.occupancy > 85 ? (trend.occupancy - 85) * 3 : 0;
      let infScore = trend.infection > 2.0 ? (trend.infection - 2.0) * 20 : 0;
      let calculatedRisk = Math.min(95, Math.max(12, Number((compGap * 0.4 + occScore * 0.3 + infScore * 0.3 + 15).toFixed(1))));

      let riskCat = 'LOW';
      if (calculatedRisk >= 75) riskCat = 'CRITICAL';
      else if (calculatedRisk >= 55) riskCat = 'HIGH';
      else if (calculatedRisk >= 35) riskCat = 'MEDIUM';

      const contributingFactors = [];
      if (trend.conformance < 90) contributingFactors.push(`Clinical pathway conformance deficit: ${trend.conformance}% [Evidence: ${dayEvId}]`);
      if (trend.occupancy > 85) contributingFactors.push(`High bed occupancy (${trend.occupancy}%) straining unit capacity [Evidence: ${dayEvId}]`);
      if (trend.infection > 2.0) contributingFactors.push(`Infection rate (${trend.infection}%) exceeds 2.0% threshold [Evidence: ${dayEvId}]`);
      if (trend.wait > 30) contributingFactors.push(`Triage waiting time (${trend.wait}m) exceeds 30m target [Evidence: ${dayEvId}]`);
      if (contributingFactors.length === 0) contributingFactors.push(`All operational indicators in ${dept} satisfied target thresholds on ${dStr}.`);

      allRiskScoresToInsert.push({
        department: dept,
        score: calculatedRisk,
        category: riskCat,
        components: {
          mlRisk: calculatedRisk,
          complianceGap: compGap,
          processDeviation: compGap,
          anomalyScore: occScore + infScore,
          benchmarkGap: Number((occScore * 0.5).toFixed(1)),
          evidenceConfidence: 96.0,
          evidenceIntegrity: 100.0
        },
        contributingFactors,
        evidenceSummary: [
          `Telemetry evidence block ${dayEvId} cryptographically verified on ${dStr}.`,
          `Conformance ${trend.conformance}%, Occupancy ${trend.occupancy}%, Infection ${trend.infection}%.`
        ],
        evidenceReferences: [
          { factor: contributingFactors[0], evidenceId: dayEvId, standardCode, riskContribution: 18 }
        ],
        calculatedAt: dayDate,
        dataVersion: '2.0-Evidence-Aware',
        status: day === 0 ? 'CURRENT' : 'SUPERSEDED'
      });
    }

    // 4. Seed Daily Patient Pathways for Today & Historical Days
    if (day === 0 || day === 1 || day === 3 || day === 7) {
      const traceCount = day === 0 ? 50 : 20;
      const skippedCount = day === 0 ? 12 : (day === 7 ? 6 : (day === 3 ? 3 : 1));

      for (let i = 1; i <= traceCount; i++) {
        const caseId = `ICU-${dStr.replace(/-/g, '')}-${String(i).padStart(3, '0')}`;
        const isSkipped = i <= skippedCount;

        const events = [
          { activity: 'Admission', timestamp: new Date(dayDate.getTime() - (i * 1800000)), resource: 'Triage Nurse', status: 'COMPLETED', durationMinutes: 10 },
          { activity: 'Triage', timestamp: new Date(dayDate.getTime() - (i * 1800000) + 600000), resource: 'Duty Physician', status: 'COMPLETED', durationMinutes: 15 },
          { activity: 'Lab', timestamp: new Date(dayDate.getTime() - (i * 1800000) + 1500000), resource: 'Lab Tech', status: 'COMPLETED', durationMinutes: 25 }
        ];

        if (!isSkipped) {
          events.push({
            activity: 'Medication Verification',
            timestamp: new Date(dayDate.getTime() - (i * 1800000) + 3000000),
            resource: 'Lead ICU Pharmacist',
            status: 'COMPLETED',
            durationMinutes: 10
          });
        }

        events.push({
          activity: 'Treatment',
          timestamp: new Date(dayDate.getTime() - (i * 1800000) + 4200000),
          resource: 'Intensivist Specialist',
          status: 'COMPLETED',
          durationMinutes: 50
        });

        const traceEvId = `EV-TRACE-${caseId}`;

        allPathwaysToInsert.push({
          caseId,
          department: 'ICU',
          events,
          timestamp: dayDate,
          isCompliant: !isSkipped,
          deviations: isSkipped ? ['Skipped mandatory step: Medication Verification'] : [],
          admissionDiagnosis: isSkipped ? 'Acute Respiratory Distress' : 'Post-Op Monitoring',
          evidenceId: traceEvId,
          verificationStatus: 'VERIFIED'
        });
      }
    }
  }

  // 3 Pending Unsealed Clinical Evidence Records awaiting Auditor Manual Verification
  allEvidenceToInsert.push(
    {
      evidenceId: 'EV-PENDING-ICU-088',
      department: 'ICU',
      standardCode: 'NABH-COP.6',
      evidenceType: 'CLINICAL_VERIFICATION',
      sourceType: 'PatientPathway',
      sourceId: 'TRACE-ICU-HIGH-RISK-20261008',
      title: 'ICU High-Risk Medication Administration Double-Check Record (Bed 04)',
      description: 'Bedside two-clinician barcode verification scan recorded for patient ICU-894. Awaiting Lead Auditor manual protocol review and cryptographic sealing.',
      dataPayload: {
        patientId: 'ICU-894',
        bedNumber: 'Bed 04',
        medication: 'Potassium Chloride Infusion 20mEq/100ml',
        clinician1: 'Nurse Priya Sharma (RN-4091)',
        clinician2: 'Dr. Ramesh Nair (Critical Care)',
        scannedTimestamp: new Date().toISOString(),
        vitalSignsVerified: true,
        dosageCheck: 'Confirmed against EHR prescription order'
      },
      originalHash: 'PENDING_AUDITOR_SEAL',
      currentHash: 'PENDING_AUDITOR_SEAL',
      previousHash: globalHashChain,
      chainIndex: 0,
      isCryptographicallySealed: false,
      integrityStatus: 'PENDING_AUDITOR_REVIEW',
      recordedBy: 'Nurse Priya Sharma',
      recordedAt: new Date(),
      verificationNotes: 'Pending Lead Auditor manual protocol review and cryptographic conversion.'
    },
    {
      evidenceId: 'EV-PENDING-EME-089',
      department: 'Emergency',
      standardCode: 'NABH-AAC.4',
      evidenceType: 'PATHWAY_TRACE',
      sourceType: 'HospitalMetric',
      sourceId: 'TRIAGE-EME-DOOR-20261008',
      title: 'Emergency Door-to-Doctor Triage Electronic Timestamps (Shift A)',
      description: 'Automated digital timestamp batch for 38 emergency patient arrivals. Conformance rate 84.2% within 30-minute target window.',
      dataPayload: {
        totalArrivals: 38,
        conformingWithin30Mins: 32,
        delayedTriageCount: 6,
        averageInitialContactMinutes: 24.5,
        triageCategory: 'Emergency Level 1-3 Priority',
        sensorBatchId: 'TRIAGE-GATEWAY-BAY-02'
      },
      originalHash: 'PENDING_AUDITOR_SEAL',
      currentHash: 'PENDING_AUDITOR_SEAL',
      previousHash: globalHashChain,
      chainIndex: 0,
      isCryptographicallySealed: false,
      integrityStatus: 'PENDING_AUDITOR_REVIEW',
      recordedBy: 'Shift Supervisor (Emergency)',
      recordedAt: new Date(),
      verificationNotes: 'Pending Lead Auditor manual protocol review and cryptographic conversion.'
    },
    {
      evidenceId: 'EV-PENDING-SUR-090',
      department: 'Surgery',
      standardCode: 'JCI-IPSG.4',
      evidenceType: 'CLINICAL_VERIFICATION',
      sourceType: 'PatientPathway',
      sourceId: 'OT-SIGN-OUT-SUR-20261008',
      title: 'Operating Theatre WHO Surgical Safety Checklist Digital Sign-Off (OT-3)',
      description: 'Completed surgical safety sign-in, timeout, and sign-out checklist for cardiac catheterization and stent placement.',
      dataPayload: {
        theatreNumber: 'OT-3',
        procedure: 'Coronary Angioplasty & Drug-Eluting Stent',
        leadSurgeon: 'Dr. Michael Chang',
        anesthetist: 'Dr. Anita Desai',
        signCheckpoints: {
          signInCompleted: true,
          timeOutCompleted: true,
          signOutCompleted: true,
          spongeCountVerified: true
        }
      },
      originalHash: 'PENDING_AUDITOR_SEAL',
      currentHash: 'PENDING_AUDITOR_SEAL',
      previousHash: globalHashChain,
      chainIndex: 0,
      isCryptographicallySealed: false,
      integrityStatus: 'PENDING_AUDITOR_REVIEW',
      recordedBy: 'OT Nursing Incharge',
      recordedAt: new Date(),
      verificationNotes: 'Pending Lead Auditor manual protocol review and cryptographic conversion.'
    }
  );

  await AccreditationEvidence.create(allEvidenceToInsert);
  await HospitalMetric.create(allMetricsToInsert);
  await RiskScore.create(allRiskScoresToInsert);
  await PatientPathway.create(allPathwaysToInsert);

  // 5. Seed Real Alerts
  console.log('[Seed] Seeding alerts...');
  const alertsToInsert = [
    {
      title: 'ICU Risk Escalation [CRITICAL]',
      department: 'ICU',
      severity: 'CRITICAL',
      reason: 'Pathway conformance deficit (76%) & 12 traces skipped mandatory medication verification',
      evidence: [
        '12 of 50 patient traces (24%) skipped mandatory step \'Medication Verification\' [Evidence: EV-ICU-01]',
        'ICU occupancy 94.0% exceeds safe operating threshold 85%'
      ],
      abnormalValue: '76% Conformance',
      expectedValue: '>= 90% Conformance',
      supportingEvidenceIds: ['EV-ICU-01'],
      evidenceCount: 3,
      integrityStatus: 'VERIFIED',
      riskContribution: 18,
      recommendedCapa: 'Deploy mandatory digital barcode scanning at bedside before medication administration',
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
        '5 traces exhibited prolonged waiting time (>60 mins) before physician triage'
      ],
      abnormalValue: '48 mins',
      expectedValue: '<= 30 mins',
      supportingEvidenceIds: ['EV-EME-01'],
      evidenceCount: 1,
      integrityStatus: 'VERIFIED',
      riskContribution: 18,
      recommendedCapa: 'Deploy secondary rapid triage desk during peak hours',
      status: 'ACKNOWLEDGED',
      source: 'ANOMALY_DETECTOR',
      standardCode: 'NABH-AAC.4'
    }
  ];

  const createdAlerts = await Alert.create(alertsToInsert);

  // 6. Seed CAPA Plans
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
      predictedImpact: 31.0,
      actualImpact: 0,
      verificationStatus: 'PENDING_VERIFICATION',
      supportingEvidenceIds: ['EV-ICU-01'],
      simulationId: 'SIM-ICU-024',
      beforeMetrics: {
        riskScore: 82.0,
        complianceRate: 76.0,
        occupancyRate: 94.0,
        infectionRate: 3.4,
        recordedAt: new Date(now - 3 * DAY_MS)
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
      predictedImpact: 45.0,
      actualImpact: 50.0,
      predictionAccuracy: 90.0,
      verificationStatus: 'VERIFIED_EFFECTIVE',
      supportingEvidenceIds: ['EV-CAR-01'],
      simulationId: 'SIM-CARD-009',
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
      verificationNotes: 'Closed loop verified: Telemetry uplink reduced ECG acquisition time to 8 mins average. Predicted 45.0% vs Actual 50.0% improvement (Accuracy: 90.0%). Verification Status: VERIFIED_EFFECTIVE.',
      completedAt: new Date(now - 1 * DAY_MS)
    }
  ];

  await CapaPlan.create(capaPlans);

  // 7. Seed Staff Audit Logs
  console.log('[Seed] Seeding staff audit logs...');
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
      userName: 'Elena Rostova (Lead Quality Auditor)',
      userEmail: 'elena.rostova@hospital.org',
      userRole: 'Auditor',
      department: 'ICU',
      eventType: 'EVIDENCE_CREATED',
      actionTitle: 'Accreditation Evidence Record Anchored in Genesis Chain',
      actionDetails: 'Recorded daily cryptographic SHA-256 evidence blocks across 15 daily shift audits.',
      status: 'SUCCESS',
      timestamp: new Date(now - 90 * 60 * 1000)
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
    }
  ];

  await StaffAuditLog.create(staffAudits);

  console.log('=======================================================');
  console.log(`✅ Database successfully seeded with ${allEvidenceToInsert.length} distinct cryptographic evidence blocks across 15 historical audit days!`);
  console.log('Default Credentials:');
  console.log('  🏛️  Dean:            dean@hospital.org / dean123');
  console.log('  📋  Lead Auditor:    elena.rostova@hospital.org / auditor123');
  console.log('  🛡️  Quality Manager: sarah.jenkins@hospital.org / admin123');
  console.log('=======================================================');
  await mongoose.disconnect();
}

seedDatabase().catch(err => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
