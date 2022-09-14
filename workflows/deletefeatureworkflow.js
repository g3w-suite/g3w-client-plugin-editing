const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const DeleteFeatureStep = require('./steps/deletefeaturestep');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');
const ConfirmStep = require('./steps/confirmstep');

function DeleteFeatureWorflow(options={}) {
  options.steps = [
    new PickFeatureStep(),
    new ChooseFeatureStep(),
    new DeleteFeatureStep(),
    new ConfirmStep({type: 'delete'})
  ];
  base(this, options);
}

inherit(DeleteFeatureWorflow, EditingWorkflow);

module.exports = DeleteFeatureWorflow;
