var Layer = g3wsdk.core.layer.Layer;
var Geometry = g3wsdk.core.geometry.Geometry;
var GUI = g3wsdk.gui.GUI;

var Tool = require('./tool');
var ToolBox = require('./toolbox');
var AddFeatureWorkflow = require('../workflows/addfeatureworkflow');
var ModifyGeometryVertexWorkflow = require('../workflows/modifygeometryvertexworkflow');
var MoveFeatureWorkflow = require('../workflows/movefeatureworkflow');
var DeleteFeatureWorkflow = require('../workflows/deletefeatureworkflow');
var EditFeatureAttributesWorkflow = require('../workflows/editfeatureattributesworkflow');

// classe costruttrice di ToolBoxes
function EditorToolBoxesFactory() {
  this._mapService = GUI.getComponent('map').getService();
  // metodo adibito alla costruzione dell'Editor Control
  // e dei tasks associati
  this.build = function(editor) {
    // estraggo il layer dell'editor
    var layer = editor.getLayer();
    // estraggo il tipo di layer
    var layerType = layer.getType();
    var layerId = layer.getId();
    // definisce il layer che sarà assegnato al toolbox e ai tools
    var olLayer;
    // array contenete tutti i tasks dell'editor control
    var tools = [];
    var color;
    switch (layerType) {
      // caso layer vettoriale
      case Layer.LayerTypes.VECTOR:
        // vado a recuperare il layer (ol.Layer) della mappa
        // su cui tutti i tool agiranno
        olLayer = this._mapService.getLayerById(layerId);
        var geometryType = layer.getGeometryType();
        switch (geometryType) {
          case Geometry.GeometryTypes.POINT:
          case Geometry.GeometryTypes.MULTIPOINT:
            tools = [
              new Tool({
                id: 'point_addfeature',
                name: "Inserisci feature",
                icon: "addPoint.png",
                layer: olLayer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'point_movefeature',
                name: "Sposta feature",
                icon: "movePoint.png",
                layer: olLayer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'point_deletefeature',
                name: "Elimina feature",
                icon: "deletePoint.png",
                layer: olLayer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'point_editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                layer: olLayer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.LINESTRING:
          case Geometry.GeometryTypes.MULTILINESTRING:
            tools = [
              new Tool({
                id: 'line_addfeature',
                name: "Inserisci feature",
                icon: "addLine.png",
                layer: olLayer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'line_movevertex',
                name: "Modifica vertice",
                icon: "moveVertex.png",
                layer: olLayer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'line_deletefeature',
                name: "Elimina feature",
                icon: "deleteLine.png",
                layer: olLayer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'line_editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                layer: olLayer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.POLYGON:
          case Geometry.GeometryTypes.MULTIPOLYGON:
            tools = [
              new Tool({
                id: 'polygon_addfeature',
                name: "Inserisci feature",
                icon: "AddPolygon.png",
                layer: olLayer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'polygon_movefeature',
                name: "Muovi feature",
                icon: "MovePolygon.png",
                layer: olLayer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'polygon_movevertex',
                name: "Modifica vertice",
                icon: "moveVertex.png",
                layer: olLayer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'polygon_deletefeature',
                name: "Elimina feature",
                icon: "deleteLine.png",
                layer: olLayer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'polygon_editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                layer: olLayer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
        }
        break;
      // caso layer tabellare da mettere in piedi
      case Layer.LayerTypes.TABLE:
        editingLayer = ''; // qui da definire
        color = 'blue';
        tools = [];
        break;
      default:
        tools = [];
        break;
    }

    return new ToolBox({
      id: layer.getId(),
      type: layerType,
      editor: editor,
      layer: olLayer,
      tools: tools,
      title: "Edit " + layer.getName()
    })
  };
}

module.exports = new EditorToolBoxesFactory;