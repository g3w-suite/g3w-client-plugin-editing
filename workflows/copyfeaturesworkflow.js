const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const MoveElementsStep = require('./steps/movelementsstep');

function SelectcAndMoveElementsWorflow(options={}) {
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: tPlugin('editing.workflow.steps.selectSHIFT'),
      done: false
    },
    copy: {
      description: tPlugin('editing.workflow.steps.copyCTRL'),
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
  base(this, options);
}

inherit(SelectcAndMoveElementsWorflow, EditingWorkflow);

module.exports = SelectcAndMoveElementsWorflow;
