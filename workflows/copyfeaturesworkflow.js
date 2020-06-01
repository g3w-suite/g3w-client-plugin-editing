const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const GetVertexStep = require('./steps/getvertexstep');
const MoveElementsStep = require('./steps/movelementsstep');
const ApplicationState = g3wsdk.core.ApplicationState;

function CopyFeaturesWorflow(options={}) {
  const isPointLayer = options.layer.getGeometryType().indexOf('Point') !== -1;
  options.type = ApplicationState.ismobile ? 'single' :  'multiple';
  options.help = 'editing.steps.help.copy';
  options.steps = [];
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: options.type === 'multiple'  ? 'editing.workflow.steps.selectPointSHIFT' : 'editing.workflow.steps.selectPoint',
      directive: 't-plugin',
      done: false
    }
  });
  options.steps.push(selectelementssteps);
  if (!isPointLayer) {
    const getvertexstep = new GetVertexStep(options, true);
    getvertexstep.getTask().setSteps({
      from: {
        description: 'editing.workflow.steps.selectStartVertex',
        directive: 't-plugin',
        done: false
      }
    });
    options.steps.push(getvertexstep);
  }
  const moveelementssteps = new MoveElementsStep(options, true);
  moveelementssteps.getTask().setSteps({
    to: {
      description: 'editing.workflow.steps.selectToPaste',
      directive: 't-plugin',
      done: false
    }
  });
  options.steps.push(moveelementssteps);
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(CopyFeaturesWorflow, EditingWorkflow);

module.exports = CopyFeaturesWorflow;
