const {base, inherit} = g3wsdk.core.utils;
const EditingWorkflow = require('./editingworkflow');
const PickFeatureStep = require('./steps/pickfeaturestep');
const ModifyGeometryVertexStep = require('./steps/modifygeometryvertexstep');

function ModifyGeometryVertexWorflow(options={}) {
  options.helpMessage = 'signaler_iim.tools.update_vertex';
  options.filterFnc = feature => feature.get('shape') === null || feature.get('shape') === undefined;
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
  const modifyvertexstep = new ModifyGeometryVertexStep({
    escKeyPressEventHandler({task}={}){
      task.forceStop();
    }
  });

  modifyvertexstep.on('run', () => this.emit('active', ['snap']));
  modifyvertexstep.on('stop', () => this.emit('deactive', ['snap']));
  options.steps = [pickstep, modifyvertexstep];
  base(this, options);
}

inherit(ModifyGeometryVertexWorflow, EditingWorkflow);

module.exports = ModifyGeometryVertexWorflow;
