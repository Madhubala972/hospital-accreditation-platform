const CapaPlan = require('../models/CapaPlan');
const capaService = require('../services/capaService');

exports.createCapa = async (req, res) => {
  try {
    const { 
      problem, 
      department, 
      action, 
      responsiblePerson, 
      deadline, 
      alertId, 
      standardCode, 
      priority,
      rootCauseAnalysis,
      predictedImpact,
      supportingEvidenceIds,
      simulationId
    } = req.body;

    if (!problem || !department || !action || !responsiblePerson || !deadline) {
      return res.status(400).json({
        status: 'error',
        message: 'Problem, department, action, responsible person, and deadline are required.'
      });
    }

    const capa = await capaService.createCapaPlan({
      problem,
      department,
      action,
      responsiblePerson,
      deadline,
      alertId,
      standardCode,
      priority,
      rootCauseAnalysis,
      predictedImpact,
      supportingEvidenceIds,
      simulationId
    });

    res.status(201).json({
      status: 'success',
      message: 'CAPA plan created successfully with closed-loop simulation linkage.',
      data: capa
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateCapaStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action, responsiblePerson, verificationNotes, rootCauseAnalysis, predictedImpact } = req.body;

    if (!['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid CAPA status.' });
    }

    const updated = await capaService.updateCapaStatus(id, status, {
      action,
      responsiblePerson,
      verificationNotes,
      rootCauseAnalysis,
      predictedImpact
    });

    res.json({
      status: 'success',
      message: status === 'COMPLETED' ? 'CAPA completed and post-intervention closed-loop verification completed!' : 'CAPA status updated.',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getKanban = async (req, res) => {
  try {
    const { department } = req.query;
    const kanbanData = await capaService.getKanbanBoard(department);
    res.json({
      status: 'success',
      data: kanbanData
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getAllCapa = async (req, res) => {
  try {
    const { department, status } = req.query;
    const query = {};
    if (department && department !== 'Hospital-Wide') query.department = department;
    if (status) query.status = status;

    const capas = await CapaPlan.find(query).sort({ createdAt: -1 }).lean();
    res.json({
      status: 'success',
      count: capas.length,
      data: capas
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
