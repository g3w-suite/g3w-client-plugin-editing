const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const DeleteFeatureStep = require('./steps/deletefeaturestep');
const ConfirmStep = require('./steps/confirmstep');

function DeleteFeatureWorflow(options={}) {
  options.steps = [new DeleteFeatureStep(options), new ConfirmStep({
    type: 'delete',
    dependency: options.dependency
  })];
  base(this, options);
}

inherit(DeleteFeatureWorflow, EditingWorkflow);

module.exports = DeleteFeatureWorflow;
