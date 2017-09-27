var Layer = g3wsdk.core.layer.Layer;
var GUI = g3wsdk.gui.GUI;
var EditToolsFactory = require('./toolsfactory');
var ToolBox = require('./toolbox');


// classe costruttrice di ToolBoxes
function EditorToolBoxesFactory() {
  this._mapService = GUI.getComponent('map').getService();
  // metodo adibito alla costruzione dell'Editor Control
  // e dei tasks associati
  this.build = function(editor) {
    // estraggo il layer dell'editor
    var layer = editor.getLayer();
    var editLayer;
    // estraggo il tipo di layer
    var layerType = layer.getType();
    var layerId = layer.getId();
    // definisce il layer che sarà assegnato al toolbox e ai tools
    var tools;
    switch (layerType) {
      // caso layer vettoriale
      case Layer.LayerTypes.VECTOR:
        var geometryType = layer.getGeometryType();
        // vado a recuperare il layer (ol.Layer) della mappa
        // su cui tutti i tool agiranno
        editLayer = this._mapService.getLayerById(layerId);
        tools = EditToolsFactory.build({
          type: layerType,
          layer: editLayer,
          geometryType: geometryType
        });
        break;
      // caso layer tabellare da mettere in piedi
      case Layer.LayerTypes.TABLE:
        editingLayer = ''; // qui da definire
        tools = EditToolsFactory.build({
          type: layerType,
          layer: editLayer
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
      layer: editLayer,
      tools: tools,
      title: "Edit " + layer.getName()
    })
  };
}

module.exports = new EditorToolBoxesFactory;