const Layer = g3wsdk.core.layer.Layer;
const EditToolsFactory = require('./toolsfactory');
const ToolBox = require('./toolbox');

function EditorToolBoxesFactory() {
  this.build = function(layer, options={}) {
    //get editing contsraints
    const constraints = layer.getEditingConstrains();
    // get editing capabilities (create, update_attributes, update_geometry, delete)
    const capabilities = layer.getEditingCapabilities();
    const type = layer.getType();
    const id = layer.getId();
    const color = layer.getColor();
    let tools = [];
    switch (type) {
      case Layer.LayerTypes.VECTOR:
        const geometryType = layer.getGeometryType();
        tools = EditToolsFactory.build({
          layer,
          geometryType: geometryType,
          type,
          capabilities
        });
        break;
      case Layer.LayerTypes.TABLE:
        tools = EditToolsFactory.build({
          layer,
          type,
          capabilities
        });
        break;
      default:
        break;
    }
    return new ToolBox({
      id,
      color,
      type,
      layer,
      tools,
      show: id !== 'vertex_e7494365_b08b_4a5b_879f_ac587532dd13' && id !== 'features_bdd79a41_6f26_4598_87fe_4a5ca8b8d759',
      lngTitle: 'editing.toolbox.title',
      title: ` ${layer.getName()}`,
      constraints
    })
  };
}

module.exports = new EditorToolBoxesFactory;
