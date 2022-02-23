const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  options.steps = [addfeaturestep, openformstep];
  base(this, options);
  this.addToolsOfTools({
    step: addfeaturestep,
    tools: ['snap', 'measure']
  })
}

inherit(AddFeatureWorflow, EditingWorkflow);

module.exports = AddFeatureWorflow;
