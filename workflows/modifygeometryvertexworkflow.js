const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  const pickstep = new PickFeatureStep(options);
  pickstep.on('run', ({inputs, context}) => {
    const layer = inputs.layer;
    const snapTool = {
      type: 'snap',
      options: {
        layerId: layer.getId(),
        source: layer.getEditingLayer().getSource(),
        active: false
      }
    };
    this.emit('settoolsoftool', [snapTool]);
  });
  const modifyvertex = new ModifyGeometryVertexStep();
  modifyvertex.on('run', () => {
    this.emit('active', ['snap']);
  });
  modifyvertex.on('stop', () => {
    this.emit('deactive', ['snap']);
  });
  options.steps = [pickstep, modifyvertex];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

module.exports = ModifyGeometryVertexWorflow;
