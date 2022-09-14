const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const SplitFeatureStep = require('./steps/splitfeaturestep');
const ApplicationState = g3wsdk.core.ApplicationState;

function SplitFeaturesWorflow(options={}) {
  options.type = ApplicationState.ismobile ? 'single' :  'multiple';
  options.help = 'editing.steps.help.split';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: options.type === 'multiple'  ? 'editing.workflow.steps.selectPointSHIFT' : 'editing.workflow.steps.selectPoint',
      directive: 't-plugin',
      done: false
    }
  });
  const splitfeaturestep = new SplitFeatureStep(options, true);
  splitfeaturestep.getTask().setSteps({
    draw_line: {
      description: 'editing.workflow.steps.draw_split_line',
      directive: 't-plugin',
      done: false
    }
  });
  options.steps = [selectelementssteps, splitfeaturestep];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(SplitFeaturesWorflow, EditingWorkflow);

module.exports = SplitFeaturesWorflow;
