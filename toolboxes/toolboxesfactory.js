const Layer = g3wsdk.core.layer.Layer;
const EditToolsFactory = require('./toolsfactory');
const ToolBox = require('./toolbox');

function EditorToolBoxesFactory() {
  this.build = function(layer) {
    const constraints = layer.getEditingConstrains();
    const type = layer.getType();
    const id = layer.getId();
    const color = layer.getColor();
    let tools;
    switch (type) {
      case Layer.LayerTypes.VECTOR:
        const geometryType = layer.getGeometryType();
        tools = EditToolsFactory.build({
          layer,
          geometryType: geometryType,
          type
        });
        break;
      case Layer.LayerTypes.TABLE:
        tools = EditToolsFactory.build({
          layer,
          type
        });
        break;
      default:
        tools = [];
        break;
    }
    return new ToolBox({
      id,
      color,
      type,
      layer,
      tools,
      lngTitle: 'editing.toolbox.title',
      title: ` ${layer.getName()}`,
      constraints
    })
  };
}

module.exports = new EditorToolBoxesFactory;
