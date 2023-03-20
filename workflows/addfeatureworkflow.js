const {base, inherit} = g3wsdk.core.utils;
const {isPolygonGeometryType} = g3wsdk.core.geometry.Geometry;
const EditingWorkflow = require('./editingworkflow');
const AddFeatureStep = require('./steps/addfeaturestep');
const OpenFormStep = require('./steps/openformstep');

function AddFeatureWorkflow(options={}) {
  const addfeaturestep = new AddFeatureStep(options);
  const openformstep = new OpenFormStep(options);
  const drawTool = {
    type: 'draw',
    options: {
      shape_types: [
        {
          type:'Draw',
          label: 'draw'
        },
        {
          type:'Square',
          label: 'square'
        },
        {
          type: 'Box',
          label: 'box'
        },
        {
          type:'Triangle',
          label: 'triangle'
        },
        {
          type: 'Circle',
          label: 'circle'
        },
        {
          type: 'Ellipse',
          label: 'ellipse'
        }
      ],
      current_shape_type: 'Draw',
      edit_feature_geometry: 'vertex',
      radius: null,
      ellipse: {
        horizontal: null,
        vertical: null
      },
      init(){
        this.radius = null;
        this.ellipse.horizontal = null;
        this.ellipse.vertical = null;
        switch (this.current_shape_type) {
          case 'Circle':
            this.radius = 0;
            this.edit_feature_geometry = 'radius';
            break;
          case 'Ellipse':
            this.ellipse.horizontal = 0;
            this.ellipse.vertical = 0;
            this.edit_feature_geometry = 'radius';
            break;
          default:
            this.edit_feature_geometry = 'vertex';
        }
      },
      onChange(type){
        this.init();
        addfeaturestep.getTask().changeDrawShapeStyle(type);
      },
      onBeforeDestroy(){
        this.current_shape_type = 'Draw';
        this.edit_feature_geometry = null;
        this.radius = null;
        this.ellipse.horizontal = null;
        this.ellipse.vertical = null;
      }
    }
  };
  addfeaturestep.on('run', ({inputs, context}) => {
    const toolsoftools = [];
    delete inputs.draw_options;
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
    if (isPolygonGeometryType(layer.getGeometryType())) toolsoftools.push(drawTool);
    this.emit('settoolsoftool', toolsoftools);
    inputs.draw_options = drawTool.options;
  });
  addfeaturestep.on('stop', () => {
    this.emit('unsettoolsoftool');
  });

  options.steps = [addfeaturestep, openformstep];
  base(this, options);
}

inherit(AddFeatureWorkflow, EditingWorkflow);

module.exports = AddFeatureWorkflow;
