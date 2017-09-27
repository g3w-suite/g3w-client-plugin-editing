var Layer = g3wsdk.core.layer.Layer;
var Geometry = g3wsdk.core.geometry.Geometry;
var Tool = require('./tool');
var AddFeatureWorkflow = require('../workflows/addfeatureworkflow');
var ModifyGeometryVertexWorkflow = require('../workflows/modifygeometryvertexworkflow');
var MoveFeatureWorkflow = require('../workflows/movefeatureworkflow');
var DeleteFeatureWorkflow = require('../workflows/deletefeatureworkflow');
var EditFeatureAttributesWorkflow = require('../workflows/editfeatureattributesworkflow');

var WORKFLOWS = {
  'addfeature': AddFeatureWorkflow,
  'deletefeature': DeleteFeatureWorkflow,
  'editattributes': EditFeatureAttributesWorkflow,
  'movefeature': MoveFeatureWorkflow,
  'movevertex': ModifyGeometryVertexWorkflow
};

// classe costruttrice di Tools
function EditorToolsFactory() {
  // create a single tool
  this.buildTool = function(options) {
    //TODO
  };
  // e dei tasks associati
  this.build = function(options) {
    options = options || {};
    var type = options.type || Layer.LayerTypes.VECTOR;
    var layer = options.layer;
    var tools;
    switch (type) {
      case Layer.LayerTypes.VECTOR:
        var geometryType = options.geometryType;
        switch (geometryType) {
          case Geometry.GeometryTypes.POINT:
          case Geometry.GeometryTypes.MULTIPOINT:
            tools = [
              new Tool({
                id: 'addfeature',
                name: "Inserisci feature",
                icon: "addPoint.png",
                layer: layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: "Sposta feature",
                icon: "movePoint.png",
                layer: layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "Elimina feature",
                icon: "deletePoint.png",
                layer: layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                layer: layer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.LINESTRING:
          case Geometry.GeometryTypes.MULTILINESTRING:
            tools = [
              new Tool({
                id: 'addfeature',
                name: "Inserisci feature",
                icon: "addLine.png",
                layer: layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: "Modifica vertice",
                icon: "moveVertex.png",
                layer: layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "Elimina feature",
                icon: "deleteLine.png",
                layer: layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                layer: layer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.POLYGON:
          case Geometry.GeometryTypes.MULTIPOLYGON:
            tools = [
              new Tool({
                id: 'addfeature',
                name: "Inserisci feature",
                icon: "AddPolygon.png",
                layer: layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: "Muovi feature",
                icon: "MovePolygon.png",
                layer: layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: "Modifica vertice",
                icon: "MovePolygonVertex.png",
                layer: layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "Elimina feature",
                icon: "deletePolygon.png",
                layer: layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: "Modifica attributi",
                icon: "editAttributes.png",
                layer: layer,
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
        tools = [
          new Tool({
            id: 'modifica_tabella',
            name: "Modifica attributi",
            icon: "editAttributes.png",
            layer: layer,
            op: EditFeatureAttributesWorkflow
          })
        ];
        break;
      default:
        tools = [];
        break;
    }
    return tools
  };
}

module.exports = new EditorToolsFactory;