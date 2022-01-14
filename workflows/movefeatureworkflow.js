const {base, inherit} = g3wsdk.core.utils;
const ApplicationState = g3wsdk.core.ApplicationState;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const MoveFeatureStep = require('./steps/movefeaturestep');

function MoveFeatureWorflow(options={}) {
  options.helpMessage = 'signaler_iim.tools.move_feature';
  const selectstep = new SelectElementsStep({
    type:   options.type = ApplicationState.ismobile ? 'single' :  'multiple'
  });
  options.steps = [selectstep, new MoveFeatureStep()];
  base(this, options);
}

inherit(MoveFeatureWorflow, EditingWorkflow);

module.exports = MoveFeatureWorflow;