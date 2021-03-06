const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const AddTableFeatureStep = require('./steps/addtablefeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddTableFeatureWorflow(options={}) {
  options.steps = [new AddTableFeatureStep(), new OpenFormStep()];
  base(this, options);
}

inherit(AddTableFeatureWorflow, EditingWorkflow);

module.exports = AddTableFeatureWorflow;
