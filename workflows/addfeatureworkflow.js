const {base, inherit} = g3wsdk.core.utils;
const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorkflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  const toolsoftools = [];
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
    toolsoftools.push(snapTool);
    const drawTool = {
      type: 'draw',
      options: {
        shape_types: ['Draw', 'Square', 'Box', 'Triangle',  'Circle', 'Ellipse'],
        onChange(type){
          addfeaturestep.getTask().changeDrawShapeStyle(type);
        }
      }
    };
    if (isPolygonGeometryType(layer.getGeometryType())) toolsoftools.push(drawTool);
    this.emit('active', ['snap']);
    this.emit('settoolsoftool', toolsoftools);
  });
  addfeaturestep.on('stop', () => {
    this.emit('deactive', toolsoftools.map(toolftools => toolftools.id));
    toolsoftools.splice(0);
  });
  options.steps = [addfeaturestep, openformstep];
  base(this, options);
}

inherit(AddFeatureWorkflow, EditingWorkflow);

module.exports = AddFeatureWorkflow;
