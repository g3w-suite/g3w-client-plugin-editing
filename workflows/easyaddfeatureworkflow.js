const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const OpenFormStep = require('./steps/openformstep');

function EasyAddFeatureWorflow(options={}) {
  const openformstep = new OpenFormStep(options);
  options.steps = [openformstep];
  base(this, options);
}

inherit(EasyAddFeatureWorflow, EditingWorkflow);

module.exports = EasyAddFeatureWorflow;
