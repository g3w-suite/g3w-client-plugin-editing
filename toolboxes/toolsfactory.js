const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const t = g3wsdk.core.i18n.tPlugin;
const Tool = require('./tool');
const AddFeatureWorkflow = require('../workflows/addfeatureworkflow');
const ModifyGeometryVertexWorkflow = require('../workflows/modifygeometryvertexworkflow');
const ModifyLineGeometryVertexWorkflow = require('../workflows/modifylinegeometryvertexworkflow');
const MoveFeatureWorkflow = require('../workflows/movefeatureworkflow');
const DeleteFeatureWorkflow = require('../workflows/deletefeatureworkflow');
const EditFeatureAttributesWorkflow = require('../workflows/editfeatureattributesworkflow');
const SwitchLineDirectionWorkflow = require('../workflows/switchlinedirectionworkflow');

// classe costruttrice di Tools
function EditorToolsFactory() {
  // create a single tool
  this.buildTool = function(options) {
    //TODO
  };
  // e dei tasks associati
  this.build = function(options={}) {
    const {type=Layer.LayerTypes.VECTOR, layer, layerId, dependency} = options;
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
                dependency,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: t("editing.tools.move_feature"),
                icon: "movePoint.png",
                layer,
                type,
                dependency,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deletePoint.png",
                layer,
                dependency,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
                icon: "editAttributes.png",
                layer,
                dependency,
                op: EditFeatureAttributesWorkflow
              })
            ];
            const EditingService = require('../services/editingservice');
            const toolsconfig = EditingService.getNodeLayerTools(layerId);
            if (toolsconfig && toolsconfig.exclude) {
              tools = tools.filter((tool) => {
                return toolsconfig.exclude.indexOf(tool.getId()) === -1;
              })
            }
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
                dependency,
                type,
                op: AddFeatureWorkflow,
                constraints: {
                  minPoints: 2,
                  maxPoints: 2
                }
              }),
              new Tool({
                id: 'movevertex',
                name: t("editing.tools.update_vertex"),
                icon: "moveVertex.png",
                layer,
                dependency,
                op: ModifyLineGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: t("editing.tools.delete_feature"),
                icon: "deleteLine.png",
                layer,
                dependency,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: t("editing.tools.update_feature"),
                icon: "editAttributes.png",
                layer: layer,
                dependency,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'switch',
                name: t("editing.tools.add_feature"),
                icon: "switch.png",
                layer,
                dependency,
                type,
                op: SwitchLineDirectionWorkflow
              }),
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
      default:
        tools = [];
        break;
    }
    return tools
  };
}

module.exports = new EditorToolsFactory;
