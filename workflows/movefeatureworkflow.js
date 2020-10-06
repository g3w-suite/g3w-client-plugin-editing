const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const MoveFeatureStep = require('./steps/movefeaturestep');

function MoveFeatureWorflow(options={}) {
  options.helpMessage = 'editing.tools.move_feature';
  options.steps = [new PickFeatureStep(), new MoveFeatureStep()];
  base(this, options);
}

inherit(MoveFeatureWorflow, EditingWorkflow);

module.exports = MoveFeatureWorflow;