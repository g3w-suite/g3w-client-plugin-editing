const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const MoveElementsStep = require('./steps/movelementsstep');
const OpenFormStep = require('./steps/openformstep');

function SelectcAndMoveElementsWorflow(options={}) {
  const {layer} = options;
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: layer && layer.isPkEditable() ? tPlugin('editing.workflow.steps.select') : tPlugin('editing.workflow.steps.selectSHIFT'),
      done: false
    },
    from: {
      description: tPlugin('editing.workflow.steps.selectStartVertex'),
      done: false
    }
  });
  const moveelementssteps = new MoveElementsStep(options, true);
  moveelementssteps.getTask().setSteps({
    to: {
      description: tPlugin('editing.workflow.steps.selectToPaste'),
      done: false
    }
  });
  options.steps = [selectelementssteps, moveelementssteps];
  if (layer && layer.isPkEditable()) {
    const openformstep = new OpenFormStep(options);
    options.steps.push(openformstep);
  }
  base(this, options);
}

inherit(SelectcAndMoveElementsWorflow, EditingWorkflow);

module.exports = SelectcAndMoveElementsWorflow;
