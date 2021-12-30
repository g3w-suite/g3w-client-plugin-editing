const {base, inherit} = g3wsdk.core.utils;
const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorkflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  let current_shape_type = null;
  addfeaturestep.on('run', ({inputs, context}) => {
    const toolsoftools = [];
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
        shape_type: current_shape_type,
        onChange(type){
          addfeaturestep.getTask().changeDrawShapeStyle(type);
          current_shape_type = type;
        },
        onBeforeDestroy(){
          current_shape_type = null;
          delete inputs.current_shape_type;
        }
      }
    };
    if (isPolygonGeometryType(layer.getGeometryType())) toolsoftools.push(drawTool);
    this.emit('settoolsoftool', toolsoftools);
    inputs.current_shape_type = current_shape_type;
  });
  addfeaturestep.on('stop', () => {
    this.emit('unsettoolsoftool');
  });

  options.steps = [addfeaturestep, openformstep];
  base(this, options);
}

inherit(AddFeatureWorkflow, EditingWorkflow);

module.exports = AddFeatureWorkflow;
