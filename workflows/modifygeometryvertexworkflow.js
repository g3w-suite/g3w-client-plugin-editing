var inherit = g3wsdk.core.utils.inherit;
var base =  g3wsdk.core.utils.base;
var EditingWorkflow = require('./editingworkflow');
var PickFeatureStep = require('./steps/pickfeaturestep');
var ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  const pickstep = new PickFeatureStep(options);
  pickstep.on('run', ({inputs, context}) => {
    const layer = inputs.layer;
    const snapTool = {
      type: 'snap',
      options: {
        source: layer.getSource(),
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
