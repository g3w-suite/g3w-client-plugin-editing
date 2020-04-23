const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const MergeFeaturesStep = require('./steps/mergefeaturesstep');

function MergeFeaturesWorflow(options={}) {
  options.steps = [new MergeFeaturesStep()];
  base(this, options);
}

inherit(MergeFeaturesWorflow, EditingWorkflow);

module.exports = MergeFeaturesWorflow;
