const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const SplitFeatureStep = require('./steps/splitfeaturestep');

function SplitFeaturesWorflow(options={}) {
  options.type = 'bbox';
  options.help = 'editing.steps.help.split';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: 'editing.workflow.steps.selectSHIFT',
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
  base(this, options);
}

inherit(SplitFeaturesWorflow, EditingWorkflow);

module.exports = SplitFeaturesWorflow;
