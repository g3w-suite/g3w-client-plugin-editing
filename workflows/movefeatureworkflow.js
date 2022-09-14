const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');
const MoveFeatureStep = require('./steps/movefeaturestep');

function MoveFeatureWorflow(options={}) {
  options.helpMessage = 'editing.tools.move_feature';
  options.steps = [
    new PickFeatureStep(),
    new ChooseFeatureStep(),
    new MoveFeatureStep()
  ];
  base(this, options);
}

inherit(MoveFeatureWorflow, EditingWorkflow);

module.exports = MoveFeatureWorflow;