const {inherit, base} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const DeleteFeatureStep = require('./steps/deletefeaturestep');
const ConfirmStep = require('./steps/confirmstep');

function DeleteFeatureWorflow(options={}) {
  options.steps = [
    new DeleteFeatureStep(),
    new ConfirmStep({type: 'delete'})
  ];
  base(this, options);
}

inherit(DeleteFeatureWorflow, EditingWorkflow);

module.exports = DeleteFeatureWorflow;
