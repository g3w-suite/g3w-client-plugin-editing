const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const MoveElementsStep = require('./steps/movelementsstep');

function SplitFeaturesWorflow(options={}) {
  const selectelementssteps = new PickFeatureStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: tPlugin('editing.workflow.steps.select'),
      done: false
    },
  });
  const moveelementssteps = new MoveElementsStep(options, true);
  moveelementssteps.getTask().setSteps({
    to: {
      description: tPlugin('editing.workflow.steps.selectToPaste'),
      done: false
    }
  });
  options.steps = [selectelementssteps, moveelementssteps];
  base(this, options);
}

inherit(SplitFeaturesWorflow, EditingWorkflow);

module.exports = SplitFeaturesWorflow;
