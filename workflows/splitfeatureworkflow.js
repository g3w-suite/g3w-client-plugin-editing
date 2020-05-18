const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const SplitFeatureStep = require('./steps/splitfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function SplitFeaturesWorflow(options={}) {
  const {layer} = options;
  const isPkEditable = layer.isPkEditable()
  options.type = isPkEditable ? 'single' : 'bbox';
  options.help = 'editing.steps.help.split';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: isPkEditable ? 'editing.workflow.steps.select' : 'editing.workflow.steps.selectSHIFT',
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
  if (isPkEditable) {
    const openformstep = new OpenFormStep(options);
    options.steps.push(openformstep);
  }
  base(this, options);
}

inherit(SplitFeaturesWorflow, EditingWorkflow);

module.exports = SplitFeaturesWorflow;
