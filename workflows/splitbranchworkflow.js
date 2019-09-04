const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SplitBranchStep = require('./steps/splitbranchstep');

function SplitBranchWorkflow(options={}) {
  options.steps = [new SplitBranchStep()];
  base(this, options);
}

inherit(SplitBranchWorkflow, EditingWorkflow);


module.exports = SplitBranchWorkflow;
