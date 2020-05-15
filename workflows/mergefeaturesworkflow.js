const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const MergeFeaturesStep = require('./steps/mergefeaturesstep');

function MergeFeaturesWorkflow(options={}) {
  options.type = 'bbox';
  options.help = 'editing.steps.help.merge';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: tPlugin('editing.workflow.steps.selectSHIFT'),
      done: false
    }
  });
  const mergefeaturesstep = new MergeFeaturesStep(options, true);
  mergefeaturesstep.getTask().setSteps({
    choose: {
      description: tPlugin('editing.workflow.steps.merge'),
      done: false
    }
  });
  options.steps = [selectelementssteps, mergefeaturesstep];
  base(this, options);
}

inherit(MergeFeaturesWorkflow, EditingWorkflow);

module.exports = MergeFeaturesWorkflow;
