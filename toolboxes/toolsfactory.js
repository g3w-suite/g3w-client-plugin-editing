const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const t = g3wsdk.core.i18n.tPlugin;
const Tool = require('./tool');
const AddFeatureWorkflow = require('../workflows/addfeatureworkflow');
const ModifyGeometryVertexWorkflow = require('../workflows/modifygeometryvertexworkflow');
const MoveFeatureWorkflow = require('../workflows/movefeatureworkflow');
const DeleteFeatureWorkflow = require('../workflows/deletefeatureworkflow');
const EditFeatureAttributesWorkflow = require('../workflows/editfeatureattributesworkflow');
const EditTableFeaturesWorkflow = require('../workflows/edittableworkflow');
const AddTableFeatureWorflow = require('../workflows/addtablefeatureworkflow');

// classe costruttrice di Tools
function EditorToolsFactory() {
  // create a single tool
  this.buildTool = function(options) {
    //TODO
  };
  // e dei tasks associati
  this.build = function(options) {
    options = options || {};
    const type = options.type || Layer.LayerTypes.VECTOR;
    const layer = options.layer;
    let tools;
    switch (type) {
      case Layer.LayerTypes.VECTOR:
        const geometryType = options.geometryType;
        switch (geometryType) {
          case Geometry.GeometryTypes.POINT:
          case Geometry.GeometryTypes.MULTIPOINT:
            tools = [
              new Tool({
                id: 'addfeature',
                name: t("editing.tools.add_feature"),
                icon: "addPoint.png",
                layer: layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: t("editing.tools.move_feature"),
                icon: "movePoint.png",
                layer: layer,
                type: type,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deletePoint.png",
                layer: layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
                icon: "editAttributes.png",
                layer: layer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.LINESTRING:
          case Geometry.GeometryTypes.MULTILINESTRING:
          case Geometry.GeometryTypes.LINE:
          case Geometry.GeometryTypes.MULTILINE:
            tools = [
              new Tool({
                id: 'addfeature',
                name: t("editing.tools.add_feature"),
                icon: "addLine.png",
                layer: layer,
                type: type,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: t("editing.tools.update_vertex"),
                icon: "moveVertex.png",
                layer: layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deleteLine.png",
                layer: layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
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
                name: t("editing.tools.add_feature"),
                icon: "addPolygon.png",
                layer: layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: t("editing.tools.move_feature"),
                icon: "movePolygon.png",
                layer: layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: t("editing.tools.update_vertex"),
                icon: "movePolygonVertex.png",
                layer: layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deletePolygon.png",
                layer: layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
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
        tools = [
          new Tool({
            id: 'addfeature',
            name: t("editing.tools.add_feature"),
            icon: "addTableRow.png",
            layer: layer,
            op: AddTableFeatureWorflow
          }),
          new Tool({
            id: 'edittable',
            name: t("editing.tools.update_feature"),
            icon: "editAttributes.png",
            layer: layer,
            op: EditTableFeaturesWorkflow
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
