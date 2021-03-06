const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const OpenTableStep = require('./steps/opentablestep');

function EditTableFeaturesWorkflow(options={}) {
  options.steps = [new OpenTableStep()];
  base(this, options);
}

inherit(EditTableFeaturesWorkflow, EditingWorkflow);

module.exports = EditTableFeaturesWorkflow;