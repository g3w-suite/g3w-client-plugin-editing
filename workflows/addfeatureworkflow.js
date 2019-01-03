const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  options.steps = [addfeaturestep, openformstep];
  base(this, options);
}

inherit(AddFeatureWorflow, EditingWorkflow);

module.exports = AddFeatureWorflow;
