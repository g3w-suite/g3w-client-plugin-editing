const { Layer } = g3wsdk.core.layer;
const { Geometry } = g3wsdk.core.geometry;
const { GUI } = g3wsdk.gui;
const {
  isSameBaseGeometryType,
} = g3wsdk.core.geoutils;
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
const AddFeatureFromMapVectorLayersWorflow = require('../workflows/addfeaturefrommapvectorlayersworkflow');
const CopyFeaturesFromOtherLayerWorkflow = require('../workflows/copyfeaturesfromotherlayerworkflow');

function EditorToolsFactory() {
  /**
   * Method to create tools base on type (point, Line, e..t) editing type (create/update/detele)
   * @param type Point, Line, Polygon, Table
   * @param layer
   * @param capabilities (create/update, delete) or undefined meaning all possible tools base on type
   */
  this.createTools = function({type, isMultiGeometry, layer, capabilities}){
    let tools = [];
    const mapService = GUI.getService('map');
    switch (type) {
      case 'Point':
        tools = [
          {
            config: {
              id: 'addfeature',
              name: "editing.tools.add_feature",
              icon: "addPoint.png",
              layer,
              row: 1,
              op: AddFeatureWorkflow,
              type: ['add_feature']
            },
          },
          {
            config:{
              id: 'editattributes',
              name: "editing.tools.update_feature",
              icon: "editAttributes.png",
              layer,
              row: 1,
              op: EditFeatureAttributesWorkflow,
              type: ['change_attr_feature']
            }
          },
          {
            config: {
              id: 'deletefeature',
              name: "editing.tools.delete_feature",
              icon: "deletePoint.png",
              layer,
              row: 1,
              op: DeleteFeatureWorkflow,
              type: ['delete_feature']
            }
          },
          {
            config: {
              id: 'editmultiattributes',
              name: "editing.tools.update_multi_features",
              icon: "multiEditAttributes.png",
              layer,
              row: 2,
              once: true,
              op: EditMultiFeatureAttributesWorkflow,
              type: ['change_attr_feature']
            }
          },
          {
            config: {
              id: 'movefeature',
              name: "editing.tools.move_feature",
              icon: "movePoint.png",
              layer,
              row: 2,
              op: MoveFeatureWorkflow,
              type: ['change_feature']
            }
          },
          {
            config: {
              id: 'copyfeaturesfromotherlayer',
              name: "editing.tools.pastefeaturesfromotherlayers",
              icon: "pasteFeaturesFromOtherLayers.png",
              layer,
              once: true,
              conditions: {
                enabled: (function(){
                  const layerId = layer.getId();
                  const geometryType = layer.getGeometryType();
                  const selectionLayerSource = mapService.defaultsLayers.selectionLayer.getSource();
                  const data = {
                    bool: false,
                    tool: undefined
                  };
                  const checkSelectedFeatureLayers = () => {
                    const {bool, tool} = data;
                    const featuresFilter =  selectionLayerSource.getFeatures().filter(feature => {
                      const featureGeometryType = feature.getGeometry() && feature.getGeometry().getType();
                      if ((feature.__layerId !== layerId) && isSameBaseGeometryType(geometryType, featureGeometryType) ) {
                        return (geometryType === featureGeometryType) || Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(featureGeometryType);
                      }
                      return false;                   });
                    const enabled = bool && featuresFilter.length > 0;
                    tool.setEnabled(enabled);
                    return enabled;
                  };
                  return ({bool, tool={}})=>{
                    data.tool = tool;
                    data.bool = bool;
                    selectionLayerSource[bool ? 'on' : 'un']('addfeature', checkSelectedFeatureLayers);
                    selectionLayerSource[bool ? 'on' : 'un']('removefeature', checkSelectedFeatureLayers);
                    return checkSelectedFeatureLayers();
                  }
                }())
              },
              row: 2,
              op: CopyFeaturesFromOtherLayerWorkflow,
              type: ['add_feature']
            }
          },
          {
            config: {
              id: 'copyfeatures',
              name: "editing.tools.copy",
              icon: "copyPoint.png",
              layer,
              once: true,
              row: 2,
              op: CopyFeaturesWorflow,
              type: ['add_feature']
            }
          },
          ...(isMultiGeometry ? [
            {
              config: {
                id: 'addPart',
                name: "editing.tools.addpart",
                icon: "addPart.png",
                layer,
                once: true,
                row: 3,
                op: AddPartToMultigeometriesWorkflow,
                type: ['add_feature', 'change_feature']
              }
            }
          ] : []),
          ...(isMultiGeometry ? [
            {
              config: {
                id: 'deletePart',
                name: "editing.tools.deletepart",
                icon: "deletePart.png",
                layer,
                row: 3,
                op: DeletePartFromMultigeometriesWorkflow,
                type: ['change_feature'],
              }
            }
          ] : [])
        ];
        break;
      case 'Line':
      case 'Polygon':
        tools = [
          {
            config: {
              id: 'addfeature',
              name: "editing.tools.add_feature",
              icon: `add${type}.png`,
              layer,
              row: 1,
              op: AddFeatureWorkflow,
              type: ['add_feature']
            }
          },
          {
            config: {
              id: 'editattributes',
              name: "editing.tools.update_feature",
              icon: "editAttributes.png",
              layer: layer,
              row: 1,
              op: EditFeatureAttributesWorkflow,
              type: ['change_attr_feature']
            }
          },
          {
            config: {
              id: 'movevertex',
              name: "editing.tools.update_vertex",
              icon: "moveVertex.png",
              layer,
              row: 1,
              op: ModifyGeometryVertexWorkflow,
              type: ['change_feature']
            }
          },
          {
            config: {
              id: 'deletefeature',
              name: "editing.tools.delete_feature",
              icon: `delete${type}.png`,
              layer,
              row: 1,
              op: DeleteFeatureWorkflow,
              type: ['delete_feature']
            }
          },
          {
            config: {
              id: 'editmultiattributes',
              name: "editing.tools.update_multi_features",
              icon: "multiEditAttributes.png",
              layer,
              row: 2,
              once: true,
              op: EditMultiFeatureAttributesWorkflow,
              type: ['change_attr_feature']
            }
          },
          {
            config:{
              id: 'movefeature',
              name: "editing.tools.move_feature",
              icon: `move${type}.png`,
              layer,
              row: 2,
              op: MoveFeatureWorkflow,
              type: ['change_feature']
            }
          },
          {
            config: {
              id: 'copyfeaturesfromotherlayer',
              name: "editing.tools.pastefeaturesfromotherlayers",
              icon: "pasteFeaturesFromOtherLayers.png",
              layer,
              once: true,
              conditions: {
                enabled: (function(){
                  const layerId = layer.getId();
                  const geometryType = layer.getGeometryType();
                  const selectionLayerSource = mapService.defaultsLayers.selectionLayer.getSource();
                  const data = {
                    bool: false,
                    tool: undefined
                  };
                  const checkSelectedFeatureLayers = () => {
                    const {bool, tool} = data;
                    const featuresFilter =  selectionLayerSource.getFeatures().filter(feature => {
                      const featureGeometryType = feature.getGeometry() && feature.getGeometry().getType();
                      if ((feature.__layerId !== layerId) && isSameBaseGeometryType(geometryType, featureGeometryType) ) {
                        return (geometryType === featureGeometryType) || Geometry.isMultiGeometry(geometryType) || !Geometry.isMultiGeometry(featureGeometryType);
                      }
                      return false;
                    });
                    const enabled = bool && featuresFilter.length > 0;
                    tool.setEnabled(enabled);
                    return enabled;
                  };
                  return ({bool, tool={}})=>{
                    data.tool = tool;
                    data.bool = bool;
                    selectionLayerSource[bool ? 'on' : 'un']('addfeature', checkSelectedFeatureLayers);
                    selectionLayerSource[bool ? 'on' : 'un']('removefeature', checkSelectedFeatureLayers);
                    return checkSelectedFeatureLayers();
                  }
                }())
              },
              row: 2,
              op: CopyFeaturesFromOtherLayerWorkflow,
              type: ['add_feature']
            }
          },
          {
            config: {
              id: 'copyfeatures',
              name: "editing.tools.copy",
              icon: `copy${type}.png`,
              layer,
              row: 2,
              once: true,
              op: CopyFeaturesWorflow,
              type: ['add_feature']
            }
          },
          ...(isMultiGeometry ? [
            {
              config: {
                id: 'addPart',
                name: "editing.tools.addpart",
                icon: "addPart.png",
                layer,
                row: 3,
                once: true,
                op: AddPartToMultigeometriesWorkflow,
                type: ['add_feature', 'change_feature']
              }
            }
          ] : []),
          ...(isMultiGeometry ? [
            {
              config: {
                id: 'deletePart',
                name: "editing.tools.deletepart",
                icon: "deletePart.png",
                layer,
                row: 3,
                op: DeletePartFromMultigeometriesWorkflow,
                type: ['change_feature']
              }
            }
          ] : []),
          {
            config: {
              id: 'splitfeature',
              name: "editing.tools.split",
              icon: "splitFeatures.png",
              layer,
              row: 3,
              once: true,
              op: SplitFeatureWorkflow,
              type:  ['change_feature']
            }
          },
          {
            config:{
              id: 'mergefeatures',
              name: "editing.tools.merge",
              icon: "mergeFeatures.png",
              layer,
              row: 3,
              once: true,
              op: MergeFeaturesWorkflow,
              type: ['change_feature']
            }
          },
          {
            config:{
              id: 'copyfeaturefromexternallayer',
              name: "editing.tools.copyfeaturefromexternallayer",
              icon: "copyPolygonFromFeature.png",
              layer,
              row: 3,
              once: true,
              visible: tool  => {
                const layerGeometryType = tool.getLayer().getGeometryType();
                const checkIfLayerHasTheSameBaseGeometryType = layer => {
                  let sameBaseGeometry = true;
                  const type = layer.getType();
                  // check if tool is visible and the layer is a Vector
                  if (type === 'VECTOR') {
                    const features = layer.getSource().getFeatures();
                    if (features.length) {
                      const feature = features[0];
                      const geometryType = feature.getGeometry().getType();
                      sameBaseGeometry = isSameBaseGeometryType(geometryType, layerGeometryType)
                    }
                  }
                  return sameBaseGeometry;
                };
                mapService.onbefore('loadExternalLayer',  layer => !tool.isVisible() && tool.setVisible(checkIfLayerHasTheSameBaseGeometryType(layer)));
                mapService.onafter('unloadExternalLayer', layer => {
                  const type = layer.getType();
                  if (tool.isVisible() && type === 'VECTOR') {
                    const features = layer.getSource().getFeatures();
                    if (features.length) {
                      const feature = features[0];
                      const geometryType = feature.getGeometry().getType();
                      if (isSameBaseGeometryType(geometryType, layerGeometryType)){
                        const visible = mapService.getExternalLayers().find(externalLayer => checkIfLayerHasTheSameBaseGeometryType(externalLayer)) !== undefined;
                        tool.setVisible(visible);
                      }
                    }
                  }
                });
                return false
              },
              op: AddFeatureFromMapVectorLayersWorflow,
              type: ['add_feature']
            }
          }
        ];
        break;
      case 'Table':
        tools =  [
          {
            config: {
              id: 'addfeature',
              name: "editing.tools.add_feature",
              icon: "addTableRow.png",
              layer,
              op: AddTableFeatureWorflow,
              type: ['add_feature'],
            }
          },
          {
            config: {
              id: 'edittable',
              name: "editing.tools.update_feature",
              icon: "editAttributes.png",
              layer,
              once: true,
              op: EditTableFeaturesWorkflow,
              type: ['delete_feature', 'change_attr_feature'],
            }
          }
        ];
        break;
    }
    return capabilities ? tools.filter(tool => tool.config.type.filter(type => capabilities.includes(type)).length > 0).map(tool => {
      // in case of capabilities all tools on line
      tool.config.row = 1;
      return new Tool(tool.config)
    }): tools.map(tool => new Tool(tool.config));
  };
  this.build = function(options={}) {
    const {type=Layer.LayerTypes.VECTOR, layer, capabilities} = options;
    let tools = [];
    switch (type) {
      case Layer.LayerTypes.VECTOR:
        const geometryType = options.geometryType;
        // check if multigeometry
        const isMultiGeometry = Geometry.isMultiGeometry(geometryType);
        // in case of Point Geometry
        if (Geometry.isPointGeometryType(geometryType)) {
          tools = this.createTools({
            layer,
            capabilities,
            type: 'Point',
            isMultiGeometry
          })
        }
        // in case of Line geometry
        else if (Geometry.isLineGeometryType(geometryType)) {
          tools = this.createTools({
            layer,
            type: 'Line',
            capabilities,
            isMultiGeometry
          })
        }
        // in case of Polygon Geometry
        else if (Geometry.isPolygonGeometryType(geometryType)){
            tools = tools = this.createTools({
              layer,
              type: 'Polygon',
              capabilities,
              isMultiGeometry
            })
        }
        break;
      case Layer.LayerTypes.TABLE:
        tools = this.createTools({
          layer,
          type: 'Table',
          capabilities
        });
        break;
      default:
        tools = [];
        break;
    }
    return tools
  };
}

module.exports = new EditorToolsFactory;
