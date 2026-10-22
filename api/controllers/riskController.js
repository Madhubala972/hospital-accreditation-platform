const riskService = require('../services/riskService');

exports.getRiskScores = async (req, res) => {
  try {
    const { department } = req.query;
    const scores = await riskService.getStoredDepartmentRisk(department);
    res.json({
      status: 'success',
      data: scores
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.evaluateRisk = async (req, res) => {
  try {
    const { department } = req.body;
    const deptsToEvaluate = (department && department !== 'Hospital-Wide') 
      ? [department] 
      : ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];

    const results = [];
    for (const d of deptsToEvaluate) {
      const r = await riskService.calculateAndStoreDepartmentRisk(d);
      results.push(r);
    }

    res.json({
      status: 'success',
      message: `Re-evaluation completed for: ${deptsToEvaluate.join(', ')}`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
