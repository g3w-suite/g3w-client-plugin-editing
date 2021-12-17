const {base, inherit} = g3wsdk.core.utils;
const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorkflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  addfeaturestep.on('run', ({inputs, context}) => {
    console.log(context)
    const layer = inputs.layer;
    const toolsoftools = [];
    const snapTool = {
      type: 'snap',
      options: {
        layerId: layer.getId(),
        source: layer.getEditingLayer().getSource(),
        active: true
      }
    };
    toolsoftools.push(snapTool);
    const drawTool = {
      type: 'draw',
      options: {
        shape_types: ['Draw','Circle', 'Square', 'Box'],
        onChange(type){
          console.log(console.log(type))
        }
      }
    };
    isPolygonGeometryType(layer.getGeometryType()) && toolsoftools.push(drawTool);
    this.emit('settoolsoftool', toolsoftools);
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
