const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const SelectElementsStep = require('./steps/selectelementsstep');
const AddFeatureStep = require('./steps/addfeaturestep');
const AddPartToMultigeometriesStep = require('./steps/addparttomultigeometriesstep');

function AddPartToMultigeometriesWorflow(options={}) {
  options.type = 'single';
  options.helpMessage = 'editing.tools.addpart';
  options.help = 'editing.steps.help.select_element';
  const selectelementssteps = new SelectElementsStep(options, true);
  selectelementssteps.getTask().setSteps({
    select: {
      description: 'editing.workflow.steps.select',
      directive: 't-plugin',
      done: false
    }
  });
  options.add = false;
  const addfeaturestep = new AddFeatureStep(options);
  addfeaturestep.getTask().setSteps({
    addfeature: {
      description: 'editing.workflow.steps.draw_part',
      directive: 't-plugin',
      done: false
    }
  });
  addfeaturestep.on('run', ({inputs, context}) => {
    const layer = inputs.layer;
    const snapTool = {
      type: 'snap',
      options: {
        layerId: layer.getId(),
        source: layer.getEditingLayer().getSource(),
        active: true
      }
    };
    this.emit('settoolsoftool', [snapTool]);
  });
  addfeaturestep.on('run', () => {
    this.emit('active', ['snap']);
  });
  addfeaturestep.on('stop', () => {
    this.emit('deactive', ['snap']);
  });
  const addparttogeometriesstep = new AddPartToMultigeometriesStep(options);
  options.steps = [selectelementssteps, addfeaturestep, addparttogeometriesstep];
  this.registerEscKeyEvent();
  base(this, options);
}

inherit(AddPartToMultigeometriesWorflow, EditingWorkflow);

module.exports = AddPartToMultigeometriesWorflow;
