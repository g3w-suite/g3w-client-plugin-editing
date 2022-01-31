import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
const {base, inherit} = g3wsdk.core.utils;
const {getVertexLength, areCoordinatesEqual, getPointFeaturesfromGeometryVertex} = g3wsdk.core.geoutils;

const EditingTask = require('./editingtask');

function ModifyGeometryVertexTask(options={}){
  this.drawInteraction = null;
  this._originalStyle = null;
  this._feature = null;
  this._deleteCondition = options.deleteCondition;
  this._snap = options.snap === false ? false : true;
  this._snapInteraction = null;
  base(this, options);
}

inherit(ModifyGeometryVertexTask, EditingTask);

const proto = ModifyGeometryVertexTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const {geo_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer() ;
  const session = context.session;
  const layerId = originalLayer.getId();
  this.startFeaturesLength = 0;
  const originalFeatures = [];
  const feature = this._feature = inputs.features[0];
  const geometry = feature.getGeometry();
  const startVertexLength = getVertexLength(geometry);
  this.deleteVertexKey;
  this._originalStyle = editingLayer.getStyle();
  const style = function() {
    const image = new ol.style.Circle({
      radius: 5,
      fill: null,
      stroke: new ol.style.Stroke({color: 'orange', width: 2})
    });
    return [
      new ol.style.Style({
        image,
        geometry(feature) {
          const coordinates = feature.getGeometry().getCoordinates()[0];
          return new ol.geom.MultiPoint(coordinates);
        }
      }),
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'yellow',
          width: 4
        })
      })
    ];
  };
  feature.setStyle(style);
  this.updateFeaturesCollection = new ol.Collection(inputs.features);
  if (geo_layer_id === layerId){
    const vertexLayerSource = this.getEditingService().getToolBoxById(vertex_layer_id).getEditingLayerSource();
    vertexLayerSource.getFeatures().forEach(vertex => this.updateFeaturesCollection.push(vertex));
  }
  this.startFeaturesLength = this.updateFeaturesCollection.getLength();
  this._modifyInteraction = new ol.interaction.Modify({
    features: this.updateFeaturesCollection,
    deleteCondition: this._deleteCondition
  });

  this.addInteraction(this._modifyInteraction);

  this._modifyInteraction.on('modifystart', ({features}) => {
    features.forEach(feature => originalFeatures.push(feature.clone()));
  });

  this._modifyInteraction.on('modifyend', ({features=[]}) =>{
    const [feature, ...vertexFeatures] = features.getArray();
    const [originalFeature, ...originalVertexFeatures] = originalFeatures;
    //check if extent of the feature is changed to be sure that is changed
    if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
      const newFeature = feature.clone();
      session.pushUpdate(layerId, newFeature, originalFeature);
      inputs.features.push(newFeature);
      // in case of change coordinate s of a vertex
      if (startVertexLength === getVertexLength(feature.getGeometry())){
        vertexFeatures.forEach((vertexFeature, index) =>{
          const vertexCoordinates = vertexFeature.getGeometry().getCoordinates();
          const originalVertexFeature = originalVertexFeatures[index];
          const originalVertexCoordinates = originalVertexFeature.getGeometry().getCoordinates();
          if (!areCoordinatesEqual(vertexCoordinates, originalVertexCoordinates)){
            const newVertexFeature = vertexFeature.clone();
            session.pushUpdate(vertex_layer_id, newVertexFeature, originalVertexFeature);
          }
        })
      } else if (startVertexLength < getVertexLength(feature.getGeometry())){
        const featureVertex = getPointFeaturesfromGeometryVertex(feature.getGeometry());
        const vertexFeaturesCoordinates = vertexFeatures.map(vertexFeature => vertexFeature.getGeometry().getCoordinates());
        const newVertex = featureVertex.find(featureVertex => {
          const findCoordinates = vertexFeaturesCoordinates.find(vertexCoordinate =>{
            return areCoordinatesEqual(vertexCoordinate, featureVertex.getGeometry().getCoordinates())
          });
          return !findCoordinates
        });
        newVertex && this.getEditingService().addNewVertexFeatureFromReportFeature({
          reportFeature: feature,
          vertexOlFeature: newVertex
        });
      } else {
        // new vertex of changed feature
        const featureVertex = getPointFeaturesfromGeometryVertex(feature.getGeometry());
        // all coordinates
        const vertexFeaturesCoordinates = vertexFeatures.map(vertexFeature => vertexFeature.getGeometry().getCoordinates());
        const deleteVertexIndex = vertexFeaturesCoordinates.findIndex(vertexCoordinate => {
          const findCoordinates = featureVertex.find(featureVertex =>{
            return areCoordinatesEqual(vertexCoordinate, featureVertex.getGeometry().getCoordinates())
          });
          return !findCoordinates
        });
        const deleteVertex = vertexFeatures[deleteVertexIndex];
        deleteVertex && this.getEditingService().removeVertexFeatureFromReportFeature(deleteVertex);
      }
      d.resolve(inputs);
      return false;
    }
  });
  this.showErrorDraw();
  return d.promise();
};

proto.stop = function(){
  this._snapInteraction && this.removeInteraction(this._snapInteraction);
  this._snapInteraction = null;
  this._feature.setStyle(this._originalStyle);
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  this.updateFeaturesCollection.clear();
  this.updateFeaturesCollection = null;
  this.hideErrorDraw();
  return true;
};


proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getEditingSource().getFeatureById(feature.getId())));
};

module.exports = ModifyGeometryVertexTask;
