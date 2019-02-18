const Layer = g3wsdk.core.layer.Layer;
const GUI = g3wsdk.gui.GUI;
const EditToolsFactory = require('./toolsfactory');
const ToolBox = require('./toolbox');

// classe costruttrice di ToolBoxes
function EditorToolBoxesFactory() {
  this._mapService = GUI.getComponent('map').getService();
  // metodo adibito alla costruzione dell'Editor Control
  // e dei tasks associati
  // il layer è il layer di editing originale da cui tutte le feature
  // verranno chiamate tramite il featuresstore provider
  this.build = function({layer, dependency=[]}) {
    // estraggo il layer dell'editor
    const editor = layer.getEditor();
    // estraggo il tipo di layer
    const layerType = layer.getType();
    const layerId = layer.getId();
    // definisce il layer che sarà assegnato al toolbox e ai tools
    let editingLayer;
    let tools;
    switch (layerType) {
      // caso layer editabile vettoriale
      case Layer.LayerTypes.VECTOR:
        const geometryType = layer.getGeometryType();
        // vado a recuperare il layer (ol.Layer) della mappa
        // su cui tutti i tool agiranno
        editingLayer = this._mapService.getLayerById(layerId);
        tools = EditToolsFactory.build({
          layer: editingLayer,
          dependency: dependency.map((_dependency) => this._mapService.getLayerById(_dependency.getId())),
          geometryType: geometryType,
          type: layerType
        });
        break;
      // caso layer tabellare da mettere in piedi
      case Layer.LayerTypes.TABLE:
        // vado a clonar il layer per utilizzarlo nei vari task
        editingLayer = _.cloneDeep(layer);
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
      title: "Edit " + layer.getName()
    })
  };
}

module.exports = new EditorToolBoxesFactory;
