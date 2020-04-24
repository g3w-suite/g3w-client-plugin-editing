const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const SplitFeatureStep = require('./steps/splitfeaturestep');

function SplitFeaturesWorflow(options={}) {
  const pickfeaturestep = new PickFeatureStep(options, true);
  pickfeaturestep.getTask().setSteps({
    select: {
      description: tPlugin('editing.workflow.steps.select'),
      done: false
    },
  });
  const splitfeaturestep = new SplitFeatureStep(options, true);
  splitfeaturestep.getTask().setSteps({
    draw_line: {
      description: tPlugin('editing.workflow.steps.draw_split_line'),
      done: false
    }
  });
  options.steps = [pickfeaturestep, splitfeaturestep];
  base(this, options);
}

inherit(SplitFeaturesWorflow, EditingWorkflow);

module.exports = SplitFeaturesWorflow;
