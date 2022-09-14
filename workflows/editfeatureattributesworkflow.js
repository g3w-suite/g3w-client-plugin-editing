const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');
const OpenFormStep = require('./steps/openformstep');

function EditFeatureAttributesWorkflow(options={}) {
  options.helpMessage = 'editing.tools.update_feature';
  options.steps = [
    new PickFeatureStep(),
    new ChooseFeatureStep(),
    new OpenFormStep()
  ];
  base(this, options);
}

inherit(EditFeatureAttributesWorkflow, EditingWorkflow);

module.exports = EditFeatureAttributesWorkflow;