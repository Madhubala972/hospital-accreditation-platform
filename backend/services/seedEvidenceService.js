const crypto = require('crypto');
const AccreditationEvidence = require('../models/AccreditationEvidence');
const Alert = require('../models/Alert');
const evidenceIntegrityService = require('./evidenceIntegrityService');

const CORE_ALERT_EVIDENCES = [
  {
    evidenceId: 'EV-CAR-COP12-01',
    department: 'Cardiology',
    standardCode: 'NABH-COP.12',
    evidenceType: 'PATHWAY_TRACE',
    sourceType: 'PatientPathway',
    sourceId: 'CASE-CAR-CASE-4102',
    title: '[Case CAR-CASE-4102] Cath Lab Door-to-Balloon Time Logged',
    description: 'Emergency angioplasty door-to-balloon pathway completed for patient CAR-CASE-4102 in 52m (Within 90m NABH threshold).',
    dataPayload: {
      caseId: 'CAR-CASE-4102',
      department: 'Cardiology',
      standardCode: 'NABH-COP.12',
      doorToBalloonMinutes: 52,
      protocol: 'Primary Percutaneous Coronary Intervention (PPCI)',
      status: 'VERIFIED'
    },
    recordedBy: 'Dr. Arthur Vance (Lead Quality Auditor)'
  },
  {
    evidenceId: 'EV-GEN-COP6-01',
    department: 'General Ward',
    standardCode: 'NABH-COP.6',
    evidenceType: 'PATHWAY_TRACE',
    sourceType: 'PatientPathway',
    sourceId: 'CASE-GEN-CASE-5021',
    title: '[Case GEN-CASE-5021] Bedside Barcode Medication Scan Log',
    description: 'Dual clinician verification and bedside 2D barcode scan recorded for high-risk medication administration.',
    dataPayload: {
      caseId: 'GEN-CASE-5021',
      department: 'General Ward',
      standardCode: 'NABH-COP.6',
      medication: 'Potassium Chloride IV Infusion',
      verificationStatus: 'DUAL_VERIFIED',
      scannerId: 'SCAN-GEN-04'
    },
    recordedBy: 'Sister Philomena (Clinical Nurse Specialist)'
  },
  {
    evidenceId: 'EV-SUR-IPSG4-01',
    department: 'Surgery',
    standardCode: 'JCI-IPSG.4',
    evidenceType: 'INCIDENT',
    sourceType: 'CriticalIncidentReport',
    sourceId: 'CASE-SUR-CASE-3095',
    title: '[Case SUR-CASE-3095] WHO Surgical Safety Checklist Timeout Scan',
    description: 'Three-phase surgical safety verification (Sign-in, Time-out, Sign-out) executed in Operating Theatre 3.',
    dataPayload: {
      caseId: 'SUR-CASE-3095',
      department: 'Surgery',
      standardCode: 'JCI-IPSG.4',
      operatingTheatre: 'OT-3',
      timeoutCompleted: true,
      surgicalLead: 'Dr. Vikram Sen'
    },
    recordedBy: 'Elena Rostova (Lead Quality Auditor)'
  },
  {
    evidenceId: 'EV-EME-01',
    department: 'Emergency',
    standardCode: 'NABH-AAC.4',
    evidenceType: 'METRIC',
    sourceType: 'HospitalMetric',
    sourceId: 'CASE-EME-CASE-2081',
    title: '[Case EME-CASE-2081] Emergency Triage Wait-Time Clinical Record',
    description: 'Door-to-doctor clinical contact triage recorded in 24m for Category-2 acute patient in Emergency Department.',
    dataPayload: {
      caseId: 'EME-CASE-2081',
      department: 'Emergency',
      standardCode: 'NABH-AAC.4',
      acuityScore: 'ESI-2',
      doorToDoctorMinutes: 24,
      thresholdMinutes: 30
    },
    recordedBy: 'Clinical Triage Supervisor'
  },
  {
    evidenceId: 'EV-ICU-01',
    department: 'ICU',
    standardCode: 'NABH-COP.6',
    evidenceType: 'PATHWAY_TRACE',
    sourceType: 'PatientPathway',
    sourceId: 'CASE-ICU-CASE-1042',
    title: '[Case ICU-CASE-1042] ICU Protocol Medication Verification Audit',
    description: 'Continuous telemetry and high-alert infusion rate double-check logged in Intensive Care Unit Bed 04.',
    dataPayload: {
      caseId: 'ICU-CASE-1042',
      department: 'ICU',
      standardCode: 'NABH-COP.6',
      infusionType: 'Noradrenaline Infusion',
      rate: '0.1 mcg/kg/min',
      independentDoubleCheck: true
    },
    recordedBy: 'Dr. Arthur Vance (ICU Quality Lead)'
  }
];

async function ensureCoreEvidenceSeeded() {
  try {
    for (const item of CORE_ALERT_EVIDENCES) {
      const existing = await AccreditationEvidence.findOne({ evidenceId: item.evidenceId });
      if (!existing) {
        await evidenceIntegrityService.recordEvidence(item);
        console.log(`[SeedEvidenceService] Sealed missing core evidence block: ${item.evidenceId}`);
      }
    }

    // Also scan all alerts in DB: if any alert references an evidence ID not yet in the ledger, auto-anchor it
    const alerts = await Alert.find().lean();
    for (const a of alerts) {
      // Gather all referenced evidence IDs in this alert
      const textToSearch = [a.title, a.reason, ...(a.evidence || [])].join(' ');
      const regex = /EV-[A-Z0-9\-_]+/gi;
      const matched = textToSearch.match(regex) || [];
      const evIds = Array.from(new Set([...(a.supportingEvidenceIds || []), ...matched]));

      for (const evId of evIds) {
        if (!evId.startsWith('EV-')) continue;
        const exists = await AccreditationEvidence.findOne({ evidenceId: evId });
        if (!exists) {
          const dept = a.department || 'Hospital-Wide';
          await evidenceIntegrityService.recordEvidence({
            evidenceId: evId,
            department: dept,
            standardCode: a.standardCode || 'NABH-COP.6',
            evidenceType: 'CLINICAL_VERIFICATION',
            sourceType: 'Alert',
            sourceId: a._id.toString(),
            title: `[Evidence Anchor] ${a.title}`,
            description: `Cryptographic audit anchor generated for clinical alert ${a.title}. Reason: ${a.reason}`,
            dataPayload: {
              alertId: a._id.toString(),
              caseId: a.caseId || null,
              department: dept,
              standardCode: a.standardCode || 'NABH-COP.6',
              reason: a.reason,
              severity: a.severity
            },
            recordedBy: 'System Cryptographic Integrity Service'
          });
          console.log(`[SeedEvidenceService] Auto-anchored missing alert evidence: ${evId}`);
        }
      }
    }
  } catch (err) {
    console.warn(`[SeedEvidenceService] Note: ${err.message}`);
  }
}

module.exports = { ensureCoreEvidenceSeeded };
