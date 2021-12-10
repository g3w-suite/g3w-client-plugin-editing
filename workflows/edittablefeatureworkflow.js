const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const OpenFormStep = require('./steps/openformstep');

function EditTableFeatureWorflow(options={}) {
  options.steps = [new OpenFormStep()];
  base(this, options);
}

inherit(EditTableFeatureWorflow, EditingWorkflow);

module.exports = EditTableFeatureWorflow;