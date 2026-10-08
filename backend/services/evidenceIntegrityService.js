const crypto = require('crypto');
const AccreditationEvidence = require('../models/AccreditationEvidence');
const Alert = require('../models/Alert');

/**
 * Deterministically computes SHA-256 hash for evidence payload and its chain link.
 */
function computeSha256Hash(payload, previousHash = 'GENESIS_HASH') {
  const normalizedPayload = typeof payload === 'object' 
    ? JSON.stringify(payload, Object.keys(payload).sort()) 
    : String(payload);
  
  const contentToHash = `${previousHash}:${normalizedPayload}`;
  return crypto.createHash('sha256').update(contentToHash).digest('hex');
}

const evidenceIntegrityService = {
  /**
   * Computes standalone or chained SHA-256 hash
   */
  computeHash(payload, previousHash = 'GENESIS_HASH') {
    return computeSha256Hash(payload, previousHash);
  },

  /**
   * Creates and commits an evidence record linked to the department's cryptographic chain.
   */
  async recordEvidence({
    evidenceId,
    department,
    standardCode,
    evidenceType,
    sourceType,
    sourceId,
    title,
    description = '',
    dataPayload,
    recordedBy = 'System Conformance Engine'
  }) {
    // 1. Fetch latest evidence in this department to determine previousHash and chainIndex
    const lastRecord = await AccreditationEvidence.findOne({ department })
      .sort({ chainIndex: -1, createdAt: -1 })
      .lean();

    const previousHash = lastRecord ? lastRecord.currentHash : 'GENESIS_HASH_00000000000000000000000000000000';
    const chainIndex = lastRecord ? (lastRecord.chainIndex || 0) + 1 : 1;

    // 2. Generate unique evidenceId if not provided
    const evId = evidenceId || `EV-${department.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;

    // 3. Compute deterministic cryptographic hash
    const currentHash = computeSha256Hash(dataPayload, previousHash);

    const evidence = await AccreditationEvidence.create({
      evidenceId: evId,
      department,
      standardCode,
      evidenceType,
      sourceType,
      sourceId,
      title,
      description,
      dataPayload,
      originalHash: currentHash,
      currentHash: currentHash,
      previousHash,
      chainIndex,
      isCryptographicallySealed: true,
      verifiedBy: recordedBy,
      verifiedAt: new Date(),
      recordedBy,
      recordedAt: new Date(),
      integrityStatus: 'VERIFIED',
      verificationNotes: 'Cryptographically anchored in evidence chain.',
      version: 1
    });

    return evidence;
  },

  /**
   * Auditor manually verifies a raw clinical observation/evidence record and cryptographically seals it into the hash chain.
   */
  async sealEvidenceWithAuditorSignoff(evidenceId, { auditorName, auditorNotes, integrityStatus = 'VERIFIED' }) {
    const evidence = await AccreditationEvidence.findOne({
      $or: [{ evidenceId }, { _id: evidenceId.match(/^[0-9a-fA-F]{24}$/) ? evidenceId : null }]
    });

    if (!evidence) {
      throw new Error(`Evidence record ${evidenceId} not found`);
    }

    // 1. Fetch latest sealed block in global chain to link hash and compute block index
    const lastSealed = await AccreditationEvidence.findOne({ 
      isCryptographicallySealed: true 
    }).sort({ chainIndex: -1 }).lean();

    const previousHash = lastSealed ? lastSealed.currentHash : 'GENESIS_HASH_00000000000000000000000000000000';
    const chainIndex = lastSealed ? (lastSealed.chainIndex || 0) + 1 : 1;

    // 2. Compute canonical SHA-256 hash
    const currentHash = computeSha256Hash(evidence.dataPayload, previousHash);

    // 3. Update evidence record
    evidence.originalHash = currentHash;
    evidence.currentHash = currentHash;
    evidence.previousHash = previousHash;
    evidence.chainIndex = chainIndex;
    evidence.isCryptographicallySealed = true;
    evidence.integrityStatus = integrityStatus;
    evidence.verifiedBy = auditorName || 'Elena Rostova (Lead Quality Auditor)';
    evidence.verifiedAt = new Date();
    evidence.auditorNotes = auditorNotes || 'Auditor manual verification completed and cryptographically sealed.';
    evidence.verificationNotes = `Manually audited & approved by ${evidence.verifiedBy}. SHA-256 cryptographic provenance anchored in Block #${chainIndex}.`;

    await evidence.save();
    return evidence;
  },

  /**
   * Verifies the cryptographic integrity of the hash chain for a department or hospital-wide.
   * If any hash mismatch or chain discontinuity is found, flags the record and generates an integrity alert.
   */
  async verifyChainIntegrity(department) {
    const fullChain = await AccreditationEvidence.find({ isCryptographicallySealed: true }).sort({ chainIndex: 1, createdAt: 1 });

    let isChainValid = true;
    let verifiedCount = 0;
    let flaggedCount = 0;
    const brokenLinks = [];
    let expectedPreviousHash = 'GENESIS_HASH_00000000000000000000000000000000';

    for (let i = 0; i < fullChain.length; i++) {
      const record = fullChain[i];
      let recordTampered = false;
      const reasons = [];

      // Check 1: Verify current hash matches recalculated hash of payload + previousHash
      const calculatedHash = computeSha256Hash(record.dataPayload, record.previousHash);
      if (calculatedHash !== record.currentHash || record.currentHash !== record.originalHash) {
        recordTampered = true;
        reasons.push(`Payload hash mismatch. Stored: ${record.currentHash.substring(0, 10)}..., Computed: ${calculatedHash.substring(0, 10)}...`);
      }

      // Check 2: Verify chain link continuity across the ledger
      if (i > 0 && record.previousHash !== expectedPreviousHash && record.previousHash !== 'GENESIS_HASH_00000000000000000000000000000000') {
        recordTampered = true;
        reasons.push(`Chain link break: previousHash does not match predecessor's currentHash.`);
      }

      const matchesDept = !department || department === 'Hospital-Wide' || record.department === department;

      if (recordTampered) {
        isChainValid = false;
        if (matchesDept) flaggedCount++;
        brokenLinks.push({
          evidenceId: record.evidenceId,
          chainIndex: record.chainIndex,
          department: record.department,
          standardCode: record.standardCode,
          reasons
        });

        // Update record status to FLAGGED in database
        if (record.integrityStatus !== 'FLAGGED') {
          record.integrityStatus = 'FLAGGED';
          record.verificationNotes = `INTEGRITY FAILURE: ${reasons.join('; ')}`;
          await record.save();

          // Raise an automated integrity Alert
          await Alert.create({
            title: `EVIDENCE INTEGRITY BREACH: ${record.evidenceId}`,
            department: record.department,
            severity: 'CRITICAL',
            reason: `Cryptographic hash chain violation detected in ${record.department} for standard ${record.standardCode}.`,
            evidence: reasons,
            status: 'OPEN',
            source: 'COMPLIANCE_ENGINE',
            standardCode: record.standardCode
          });
        }
      } else {
        if (matchesDept) verifiedCount++;
        if (record.integrityStatus === 'FLAGGED') {
          record.integrityStatus = 'VERIFIED';
          record.verificationNotes = 'Cryptographically anchored and re-verified.';
          await record.save();
        }
      }

      expectedPreviousHash = record.currentHash;
    }

    const deptTotal = (department && department !== 'Hospital-Wide') 
      ? fullChain.filter(r => r.department === department).length
      : fullChain.length;

    return {
      department: department || 'Hospital-Wide',
      chainIntegrity: isChainValid ? 'VERIFIED_SECURE' : 'COMPROMISED_CHAIN_DETECTED',
      isChainValid,
      totalEvidenceRecords: deptTotal,
      verifiedRecords: verifiedCount,
      flaggedRecords: flaggedCount,
      integrityScore: deptTotal > 0 ? Number(((verifiedCount / deptTotal) * 100).toFixed(1)) : 100.0,
      brokenLinks,
      verifiedAt: new Date()
    };
  },

  /**
   * Verifies an individual evidence record against its original hash
   */
  async verifyIndividualEvidence(evidenceId) {
    const record = await AccreditationEvidence.findOne({ evidenceId });
    if (!record) {
      throw new Error(`Evidence record ${evidenceId} not found`);
    }

    const calculatedHash = computeSha256Hash(record.dataPayload, record.previousHash);
    const isValid = (calculatedHash === record.originalHash && calculatedHash === record.currentHash);

    return {
      evidenceId: record.evidenceId,
      department: record.department,
      standardCode: record.standardCode,
      evidenceType: record.evidenceType,
      title: record.title,
      storedOriginalHash: record.originalHash,
      calculatedHash,
      previousHash: record.previousHash,
      isValid,
      integrityStatus: isValid ? 'VERIFIED' : 'FLAGGED',
      recordedBy: record.recordedBy,
      recordedAt: record.recordedAt
    };
  }
};

module.exports = evidenceIntegrityService;
