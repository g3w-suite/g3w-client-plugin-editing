const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const PickHoleStep = require('./steps/pickholestep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');
const DeleteHoleStep = require('./steps/deleteholestep');
function RemoveHoleWorflow(options={}) {
  options.steps = [
    new PickHoleStep(options),
    new ChooseFeatureStep(options),
    new DeleteHoleStep(options)
  ];
  base(this, options);
}

inherit(RemoveHoleWorflow, EditingWorkflow);

module.exports = RemoveHoleWorflow;