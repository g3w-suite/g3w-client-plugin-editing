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
const CopyFeaturesWorflow = require('../workflows/copyfeaturesworkflow');

function EditorToolsFactory() {
  // create a single tool
  this.buildTool = function(options={}) {};
  this.build = function(options={}) {
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
                layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: t("editing.tools.move_feature"),
                icon: "movePoint.png",
                layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deletePoint.png",
                layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
                icon: "editAttributes.png",
                layer,
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
                layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: t("editing.tools.update_vertex"),
                icon: "moveVertex.png",
                layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deleteLine.png",
                layer,
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
                layer,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: t("editing.tools.move_feature"),
                icon: "movePolygon.png",
                layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: t("editing.tools.update_vertex"),
                icon: "movePolygonVertex.png",
                layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'copyfeatures',
                name: t("editing.tools.copy"),
                icon: "copyPolygon.png",
                layer,
                once: true,
                op: CopyFeaturesWorflow
              }),
              new Tool({
                id: 'mergefeatures',
                name: t("editing.tools.merge"),
                icon: "mergePolygon.png",
                layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'splitfeaturet',
                name: t("editing.tools.split"),
                icon: "splitPolygon.png",
                layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deletePolygon.png",
                layer,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
                icon: "editAttributes.png",
                layer,
                op: EditFeatureAttributesWorkflow
              })
            ];
            break;
        }
        break;
      case Layer.LayerTypes.TABLE:
        tools = [
          new Tool({
            id: 'addfeature',
            name: t("editing.tools.add_feature"),
            icon: "addTableRow.png",
            layer,
            op: AddTableFeatureWorflow
          }),
          new Tool({
            id: 'edittable',
            name: t("editing.tools.update_feature"),
            icon: "editAttributes.png",
            layer,
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
