const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const MoveElementsStep = require('./steps/movelementsstep');

function SelectcAndMoveElementsWorflow(options={}) {
  const selectelementssteps = new SelectElementsStep(options, true);
  const moveelementssteps = new MoveElementsStep(options, true);
  options.steps = [selectelementssteps, moveelementssteps];
  options.steps.forEach((step) => {
    step.on('next-step', (message) => {
      console.log(message)
      this.emit('change-help-message', message)
    });
  });
  base(this, options);
}

inherit(SelectcAndMoveElementsWorflow, EditingWorkflow);

module.exports = SelectcAndMoveElementsWorflow;
