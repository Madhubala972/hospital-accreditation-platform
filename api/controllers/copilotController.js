const aiService = require('../services/aiService');

exports.askCopilot = async (req, res) => {
  try {
    const { department, question } = req.body;
    
    // Node gathers ONLY relevant data and sends minimal context to AI (Section 14)
    const result = await aiService.explainSystemResults({
      department: department || 'Hospital-Wide',
      userQuery: question
    });

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
