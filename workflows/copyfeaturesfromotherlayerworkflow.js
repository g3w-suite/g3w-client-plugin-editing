const { base, inherit } = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const CopyFeaturesFromOtherLayerStep = require('./steps/copyfeaturesfromotherlayerstep');
const OpenFormStep = require('./steps/openformstep');

function CopyFeaturesFromOtherLayerWorflow(options={}) {
  options.help = 'editing.steps.help.copy';
  const openFormStep = new OpenFormStep(options);
  options.steps = [
    new CopyFeaturesFromOtherLayerStep({
      ...options,
      openFormTask: openFormStep.getTask()
    }),
    openFormStep
  ];
  this.registerEscKeyEvent();

  base(this, options);
}

inherit(CopyFeaturesFromOtherLayerWorflow, EditingWorkflow);

module.exports = CopyFeaturesFromOtherLayerWorflow;
