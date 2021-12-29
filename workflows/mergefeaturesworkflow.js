const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const MergeFeaturesStep = require('./steps/mergefeaturesstep');
const ApplicationState = g3wsdk.core.ApplicationState;
function MergeFeaturesWorkflow(options={}) {
  options.type = 'bbox';
  options.help = 'signaler_iim.steps.help.merge';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: ApplicationState.ismobile ? 'signaler_iim.workflow.steps.selectDrawBox' : 'signaler_iim.workflow.steps.selectSHIFT',
      directive: 't-plugin',
      done: false
    }
  });
  const mergefeaturesstep = new MergeFeaturesStep(options, true);
  mergefeaturesstep.getTask().setSteps({
    choose: {
      description: 'signaler_iim.workflow.steps.merge',
      directive: 't-plugin',
      done: false
    }
  });
  options.steps = [selectelementssteps, mergefeaturesstep];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(MergeFeaturesWorkflow, EditingWorkflow);

module.exports = MergeFeaturesWorkflow;
