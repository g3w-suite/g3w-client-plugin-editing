const {inherit, base} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const OpenFormStep = require('./steps/openformstep');

function EditFeatureAttributesWorkflow(options={}) {
  options.helpMessage = 'editing.tools.update_feature';
  const step = new OpenFormStep();
  options.steps = [step];
  base(this, options);
}

inherit(EditFeatureAttributesWorkflow, EditingWorkflow);

module.exports = EditFeatureAttributesWorkflow;