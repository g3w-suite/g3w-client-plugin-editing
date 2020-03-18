const Layer = g3wsdk.core.layer.Layer;
const EditToolsFactory = require('./toolsfactory');
const ToolBox = require('./toolbox');

function EditorToolBoxesFactory() {
  this.build = function(layer) {
    const editingLayer = layer.getEditingLayer();
    const constraints = layer.getEditingConstrains();
    const editor = layer.getEditor();
    const layerType = layer.getType();
    let tools;
    switch (layerType) {
      case Layer.LayerTypes.VECTOR:
        const geometryType = layer.getGeometryType();
        tools = EditToolsFactory.build({
          layer: editingLayer,
          geometryType: geometryType,
          type: layerType
        });
        break;
      case Layer.LayerTypes.TABLE:
        tools = EditToolsFactory.build({
          layer: editingLayer,
          type: layerType
        });
        break;
      default:
        tools = [];
        break;
    }
    return new ToolBox({
      id: layer.getId(),
      color: layer.getColor(),
      type: layerType,
      editor: editor,
      layer: editingLayer,
      tools: tools,
      title: `Edit ${layer.getName()}`,
      constraints
    })
  };
}

module.exports = new EditorToolBoxesFactory;
