const { base, inherit } = g3wsdk.core.utils;
const { ApplicationState } = g3wsdk.core;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const ChooseFeatureStep = require('./steps/choosefeaturestep');
const OpenFormStep = require('./steps/openformstep');

function EditMultiFeatureAttributesWorkflow(options={}) {
  options.helpMessage = 'editing.tools.update_multi_features';
  const selectstep = new SelectElementsStep({
    type: 'multiple'
  });
  selectstep.getTask().setSteps({
    select: {
      description: ApplicationState.ismobile ? 'editing.workflow.steps.selectDrawBoxAtLeast2Feature' : 'editing.workflow.steps.selectMultiPointSHIFTAtLeast2Feature',
      buttonnext: {
        disabled: true,
        condition:({features=[]}) => features.length < 2,
        done: () => {}
      },
      directive: 't-plugin',
      dynamic: 0,
      done: false
    }
  });
  options.steps = [selectstep, new OpenFormStep({
    multi: true
  })];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(EditMultiFeatureAttributesWorkflow, EditingWorkflow);

module.exports = EditMultiFeatureAttributesWorkflow;