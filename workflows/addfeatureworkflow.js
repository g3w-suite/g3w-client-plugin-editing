const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorkflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
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
  options.steps = [addfeaturestep, openformstep];
  base(this, options);
}

inherit(AddFeatureWorkflow, EditingWorkflow);

module.exports = AddFeatureWorkflow;
