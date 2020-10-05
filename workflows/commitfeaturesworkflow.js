const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const ConfirmStep = require('./steps/confirmstep');

function CommitFeatureWorflow(options={}) {
  options.steps = [new ConfirmStep(options)];
  base(this, options);
}

inherit(CommitFeatureWorflow, EditingWorkflow);

module.exports = CommitFeatureWorflow;