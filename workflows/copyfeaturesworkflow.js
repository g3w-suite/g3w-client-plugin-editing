const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const tPlugin = g3wsdk.core.i18n.tPlugin;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const GetVertexStep = require('./steps/getvertexstep');
const MoveElementsStep = require('./steps/movelementsstep');
const OpenFormStep = require('./steps/openformstep');
const ApplicationState = g3wsdk.core.ApplicationState;

function SelectcAndMoveElementsWorflow(options={}) {
  options.type = ApplicationState.ismobile ? 'touch' :  'bbox';
  options.help = 'editing.steps.help.copy';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: 'editing.workflow.steps.selectSHIFT',
      directive: 't-plugin',
      done: false
    }
  });
  const getvertexstep = new GetVertexStep(options, true);
  getvertexstep.getTask().setSteps({
    from: {
      description: 'editing.workflow.steps.selectStartVertex',
      directive: 't-plugin',
      done: false
    }
  });
  const moveelementssteps = new MoveElementsStep(options, true);
  moveelementssteps.getTask().setSteps({
    to: {
      description: 'editing.workflow.steps.selectToPaste',
      directive: 't-plugin',
      done: false
    }
  });
  options.steps = [selectelementssteps, getvertexstep, moveelementssteps];
  base(this, options);
}

inherit(SelectcAndMoveElementsWorflow, EditingWorkflow);

module.exports = SelectcAndMoveElementsWorflow;
