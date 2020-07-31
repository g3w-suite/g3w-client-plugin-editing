const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const Tool = require('./tool');
const AddFeatureWorkflow = require('../workflows/addfeatureworkflow');
const ModifyGeometryVertexWorkflow = require('../workflows/modifygeometryvertexworkflow');
const MoveFeatureWorkflow = require('../workflows/movefeatureworkflow');
const DeleteFeatureWorkflow = require('../workflows/deletefeatureworkflow');
const EditFeatureAttributesWorkflow = require('../workflows/editfeatureattributesworkflow');
const EditTableFeaturesWorkflow = require('../workflows/edittableworkflow');
const AddTableFeatureWorflow = require('../workflows/addtablefeatureworkflow');
const CopyFeaturesWorflow = require('../workflows/copyfeaturesworkflow');
const SplitFeatureWorkflow = require('../workflows/splitfeatureworkflow');
const MergeFeaturesWorkflow = require('../workflows/mergefeaturesworkflow');
const AddPartToMultigeometriesWorkflow = require('../workflows/addparttomultigeometriesworkflow');
const DeletePartFromMultigeometriesWorkflow = require('../workflows/deletepartfrommultigeometriesworkflow');

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
        const isMultiGeometry = Geometry.isMultiGeometry(geometryType);
        switch (geometryType) {
          case Geometry.GeometryTypes.POINT:
          case Geometry.GeometryTypes.MULTIPOINT:
            tools = [
              new Tool({
                id: 'addfeature',
                name: "editing.tools.add_feature",
                icon: "addPoint.png",
                layer,
                op: AddFeatureWorkflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'addPartToPoint',
                  name: "editing.tools.addpart",
                  icon: "addPart.png",
                  layer,
                  once: true,
                  op: AddPartToMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'editattributes',
                name: "editing.tools.update_feature",
                icon: "editAttributes.png",
                layer,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "editing.tools.delete_feature",
                icon: "deletePoint.png",
                layer,
                op: DeleteFeatureWorkflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'deletePart',
                  name: "editing.tools.deletepart",
                  icon: "deletePart.png",
                  layer,
                  op: DeletePartFromMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'movefeature',
                name: "editing.tools.move_feature",
                icon: "movePoint.png",
                layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'copyfeaturespoint',
                name: "editing.tools.copy",
                icon: "copyPoint.png",
                layer,
                once: true,
                op: CopyFeaturesWorflow
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
                name: "editing.tools.add_feature",
                icon: "addLine.png",
                layer,
                op: AddFeatureWorkflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'addPartToPoint',
                  name: "editing.tools.addpart",
                  icon: "addPart.png",
                  layer,
                  once: true,
                  op: AddPartToMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'editattributes',
                name: "editing.tools.update_feature",
                icon: "editAttributes.png",
                layer: layer,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: "editing.tools.update_vertex",
                icon: "moveVertex.png",
                layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "editing.tools.delete_feature",
                icon: "deleteLine.png",
                layer,
                op: DeleteFeatureWorkflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'deletePart',
                  name: "editing.tools.deletpart",
                  icon: "deletePart.png",
                  layer,
                  op: DeletePartFromMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'copyfeaturespoly',
                name: "editing.tools.copy",
                icon: "copyLine.png",
                layer,
                once: true,
                op: CopyFeaturesWorflow
              }),
              new Tool({
                id: 'mergefeaturespoly',
                name: "editing.tools.merge",
                icon: "mergeFeatures.png",
                layer,
                once: true,
                op: MergeFeaturesWorkflow
              }),
              new Tool({
                id: 'splitfeatureline',
                name: "editing.tools.split",
                icon: "splitFeatures.png",
                layer,
                once: true,
                op: SplitFeatureWorkflow
              })
            ];
            break;
          case Geometry.GeometryTypes.POLYGON:
          case Geometry.GeometryTypes.MULTIPOLYGON:
            tools = [
              new Tool({
                id: 'addfeature',
                name: "editing.tools.add_feature",
                icon: "addPolygon.png",
                layer,
                op: AddFeatureWorkflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'addPartToPoint',
                  name: "editing.tools.addpart",
                  icon: "addPart.png",
                  layer,
                  once: true,
                  op: AddPartToMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'editattributes',
                name: "editing.tools.update_feature",
                icon: "editAttributes.png",
                layer,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: "editing.tools.update_vertex",
                icon: "moveVertex.png",
                layer,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "editing.tools.delete_feature",
                icon: "deletePolygon.png",
                layer,
                op: DeleteFeatureWorkflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'deletePart',
                  name: "editing.tools.deletepart",
                  icon: "deletePart.png",
                  layer,
                  op: DeletePartFromMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'movefeature',
                name: "editing.tools.move_feature",
                icon: "movePolygon.png",
                layer,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'copyfeaturespoly',
                name: "editing.tools.copy",
                icon: "copyPolygon.png",
                layer,
                once: true,
                op: CopyFeaturesWorflow
              }),
              new Tool({
                id: 'mergefeaturespoly',
                name: "editing.tools.merge",
                icon: "mergeFeatures.png",
                layer,
                once: true,
                op: MergeFeaturesWorkflow
              }),
              new Tool({
                id: 'splitfeaturepoly',
                name: "editing.tools.split",
                icon: "splitFeatures.png",
                layer,
                once: true,
                op: SplitFeatureWorkflow
              })
            ];
            break;
        }
        break;
      case Layer.LayerTypes.TABLE:
        tools = [
          new Tool({
            id: 'addfeature',
            name: "editing.tools.add_feature",
            icon: "addTableRow.png",
            layer,
            op: AddTableFeatureWorflow
          }),
          new Tool({
            id: 'edittable',
            name: "editing.tools.update_feature",
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
