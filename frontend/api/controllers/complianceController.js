const AccreditationStandard = require('../models/AccreditationStandard');
const complianceService = require('../services/complianceService');

exports.getComplianceEvaluation = async (req, res) => {
  try {
    const { department } = req.query;
    const result = await complianceService.evaluateDepartmentCompliance(department);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getStandards = async (req, res) => {
  try {
    const { department } = req.query;
    const query = (department && department !== 'Hospital-Wide') ? { department: { $in: [department, 'Hospital-Wide'] } } : {};
    const standards = await AccreditationStandard.find(query).sort({ category: 1, standardCode: 1 }).lean();
    res.json({
      status: 'success',
      count: standards.length,
      data: standards
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createStandard = async (req, res) => {
  try {
    const {
      standardCode,
      standardName,
      department,
      requirement,
      category,
      threshold,
      operator,
      metricTargetField,
      severity,
      ruleDescription,
      regulatoryBody
    } = req.body;

    if (!standardCode || !standardName || !department || threshold === undefined || !metricTargetField) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required standard fields.'
      });
    }

    const standard = await AccreditationStandard.findOneAndUpdate(
      { standardCode },
      {
        standardCode,
        standardName,
        department,
        requirement,
        category: category || 'Patient Safety',
        threshold: Number(threshold),
        operator: operator || '>=',
        metricTargetField,
        severity: severity || 'HIGH',
        ruleDescription: ruleDescription || `${standardName} must be ${operator || '>='} ${threshold}`,
        regulatoryBody: regulatoryBody || 'NABH 5th Edition'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      status: 'success',
      message: 'Accreditation standard saved successfully.',
      data: standard
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
