var Layer = g3wsdk.core.layer.Layer;
var Geometry = g3wsdk.core.geometry.Geometry;
var Tool = require('./tool');
var ToolBox = require('./toolbox');

var GeometryAddWorkflow = require('../workflows/geometryadd');
var GeometryModifyWorkflow = require('../workflows/geometrymodify');
var GeometryModifyVertexWorkflow = require('../workflows/geometrymodifyvertex');
var GeometryMoveWorkflow = require('../workflows/geometrymove');
var GeometryDeleteWorkflow = require('../workflows/geometrydelete');
var EditFeatureAttributesWorkflow = require('../workflows/editfeatureattributes');

// classe costruttrice di ToolBoxes
function EditorToolBoxesFactory() {
  // metodo adibito alla costruzione dell'Editor Control
  // e dei tasks associati
  this.build = function(editor) {
    // estraggo il layer dell'editor
    var layer = editor.getLayer();
    // estraggo il tipo di layer
    var layerType = layer.getLayerType();
    // array contenete tutti i tasks dell'editor control
    var tools = [];
    switch (layerType) {
      // caso layer vettoriale
      case Layer.LayerTypes.VECTOR:
        var geometryType = layer.getGeometryType();
        switch (geometryType) {
          case Geometry.GeometryTypes.POINT:
          case Geometry.GeometryTypes.MULTIPOINT:
            tools = [
              new Tool({
                id: 'point_addfeature',
                name: "Inserisci punto",
                icon: "addPoint.png",
                editor: editor,
                op: GeometryAddWorkflow
              }),
              new Tool({
                id: 'point_movefeature',
                name: "Modifica punto",
                icon: "movePoint.png",
                editor: editor,
                op: GeometryModifyWorkflow
              }),
              new Tool({
                id: 'point_deletefeature',
                name: "Elimina punto",
                icon: "deletePoint.png",
                editor: editor,
                op: GeometryDeleteWorkflow
              }),
              new Tool({
                id: 'point_editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                editor: editor,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.LINESTRING:
          case Geometry.GeometryTypes.MULTILINESTRING:
            tools = [
              new Tool({
                id: 'line_addfeature',
                name: "Inserisci linea",
                icon: "addLine.png",
                editor: editor,
                op: GeometryAddWorkflow
              }),
              new Tool({
                id: 'line_movevertex',
                name: "Modifica vertice",
                icon: "moveVertex.png",
                editor: editor,
                op: GeometryModifyVertexWorkflow
              }),
              new Tool({
                id: 'line_deletefeature',
                name: "Elimina linea",
                icon: "deleteLine.png",
                editor: editor,
                op: GeometryDeleteWorkflow
              }),
              new Tool({
                id: 'line_editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                editor: editor,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.POLYGON:
          case Geometry.GeometryTypes.MULTIPOLYGON:
            tools = [
              new Tool({
                id: 'polygon_addfeature',
                name: "Inserisci linea",
                icon: "AddPolygon.png",
                editor: editor,
                op: GeometryAddWorkflow
              }),
              new Tool({
                id: 'polygon_movefeature',
                name: "Inserisci linea",
                icon: "MovePolygon.png",
                editor: editor,
                op: GeometryMoveWorkflow
              }),
              new Tool({
                id: 'polygon_movevertex',
                name: "Modifica vertice",
                icon: "moveVertex.png",
                editor: editor,
                op: GeometryModifyVertexWorkflow
              }),
              new Tool({
                id: 'polygon_deletefeature',
                name: "Elimina linea",
                icon: "deleteLine.png",
                editor: editor,
                op: GeometryDeleteWorkflow
              }),
              new Tool({
                id: 'polygon_editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                editor: editor,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
        }
        break;
      // caso layer tabellare
      case Layer.LayerTypes.TABLE:
        tools = [];
        break;
      default:
        tools = [];
        break;
    }

    return new ToolBox({
      editor: editor,
      tools: tools
    })
  };
}

module.exports = new EditorToolBoxesFactory;