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
const EditMultiFeatureAttributesWorkflow = require('../workflows/editmultifeatureattributesworkflow');


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
                row: 1,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: "editing.tools.update_feature",
                icon: "editAttributes.png",
                layer,
                row:1,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "editing.tools.delete_feature",
                icon: "deletePoint.png",
                layer,
                row:1,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editmultiattributes',
                name: "editing.tools.update_multi_features",
                icon: "multiEditAttributes.png",
                layer,
                row:2,
                once: true,
                op: EditMultiFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: "editing.tools.move_feature",
                icon: "movePoint.png",
                layer,
                row: 2,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'copyfeatures',
                name: "editing.tools.copy",
                icon: "copyPoint.png",
                layer,
                once: true,
                row:2,
                op: CopyFeaturesWorflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'addPart',
                  name: "editing.tools.addpart",
                  icon: "addPart.png",
                  layer,
                  once: true,
                  row: 3,
                  op: AddPartToMultigeometriesWorkflow
                })
              ] : []),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'deletePart',
                  name: "editing.tools.deletepart",
                  icon: "deletePart.png",
                  layer,
                  row: 3,
                  op: DeletePartFromMultigeometriesWorkflow
                })
              ] : [])
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
                row:1,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: "editing.tools.update_feature",
                icon: "editAttributes.png",
                layer: layer,
                row: 1,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: "editing.tools.update_vertex",
                icon: "moveVertex.png",
                layer,
                row:1,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "editing.tools.delete_feature",
                icon: "deleteLine.png",
                layer,
                row:1,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editmultiattributes',
                name: "editing.tools.update_multi_features",
                icon: "multiEditAttributes.png",
                layer,
                row:2,
                once: true,
                op: EditMultiFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: "editing.tools.move_feature",
                icon: "moveLine.png",
                layer,
                row:2,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'copyfeatures',
                name: "editing.tools.copy",
                icon: "copyLine.png",
                layer,
                row:2,
                once: true,
                op: CopyFeaturesWorflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'addPart',
                  name: "editing.tools.addpart",
                  icon: "addPart.png",
                  layer,
                  row:3,
                  once: true,
                  op: AddPartToMultigeometriesWorkflow
                })
              ] : []),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'deletePart',
                  name: "editing.tools.deletpart",
                  icon: "deletePart.png",
                  layer,
                  row:3,
                  op: DeletePartFromMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'splitfeature',
                name: "editing.tools.split",
                icon: "splitFeatures.png",
                layer,
                row:3,
                once: true,
                op: SplitFeatureWorkflow
              }),
              new Tool({
                id: 'mergefeatures',
                name: "editing.tools.merge",
                icon: "mergeFeatures.png",
                layer,
                row:3,
                once: true,
                op: MergeFeaturesWorkflow
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
                row:1,
                op: AddFeatureWorkflow
              }),
              new Tool({
                id: 'editattributes',
                name: "editing.tools.update_feature",
                icon: "editAttributes.png",
                layer,
                row:1,
                op: EditFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movevertex',
                name: "editing.tools.update_vertex",
                icon: "moveVertex.png",
                layer,
                row:1,
                op: ModifyGeometryVertexWorkflow
              }),
              new Tool({
                id: 'deletefeature',
                name: "editing.tools.delete_feature",
                icon: "deletePolygon.png",
                layer,
                row:1,
                op: DeleteFeatureWorkflow
              }),
              new Tool({
                id: 'editmultiattributes',
                name: "editing.tools.update_multi_features",
                icon: "multiEditAttributes.png",
                layer,
                row:2,
                once: true,
                op: EditMultiFeatureAttributesWorkflow
              }),
              new Tool({
                id: 'movefeature',
                name: "editing.tools.move_feature",
                icon: "movePolygon.png",
                layer,
                row:2,
                op: MoveFeatureWorkflow
              }),
              new Tool({
                id: 'copyfeatures',
                name: "editing.tools.copy",
                icon: "copyPolygon.png",
                layer,
                row:2,
                once: true,
                op: CopyFeaturesWorflow
              }),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'addPart',
                  name: "editing.tools.addpart",
                  icon: "addPart.png",
                  layer,
                  row:3,
                  once: true,
                  op: AddPartToMultigeometriesWorkflow
                })
              ] : []),
              ...(isMultiGeometry ? [
                new Tool({
                  id: 'deletePart',
                  name: "editing.tools.deletepart",
                  icon: "deletePart.png",
                  layer,
                  row:3,
                  op: DeletePartFromMultigeometriesWorkflow
                })
              ] : []),
              new Tool({
                id: 'splitfeature',
                name: "editing.tools.split",
                icon: "splitFeatures.png",
                layer,
                row:3,
                once: true,
                op: SplitFeatureWorkflow
              }),
              new Tool({
                id: 'mergefeatures',
                name: "editing.tools.merge",
                icon: "mergeFeatures.png",
                layer,
                row:3,
                once: true,
                op: MergeFeaturesWorkflow
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
