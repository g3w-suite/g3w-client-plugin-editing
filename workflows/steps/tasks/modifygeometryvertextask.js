const {base, inherit} = g3wsdk.core.utils;
const {createMeasureTooltip, removeMeasureTooltip} = g3wsdk.ol.utils;
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
  let tooltip;
  const map = this.getMap();
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer() ;
  const session = context.session;
  const layerId = originalLayer.getId();
  let originalFeature,
    newFeature;
  const feature = this._feature = inputs.features[0];
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
  const features = new ol.Collection(inputs.features);
  this._modifyInteraction = new ol.interaction.Modify({
    features,
    deleteCondition: this._deleteCondition
  });

  this.addInteraction(this._modifyInteraction);

  this._modifyInteraction.on('modifystart', evt => {
    const feature = evt.features.getArray()[0];
    tooltip = createMeasureTooltip({
      map,
      feature
    });

    originalFeature = feature.clone();
  });

  this._modifyInteraction.on('modifyend', evt =>{
    const feature = evt.features.getArray()[0];
    if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
      newFeature = feature.clone();
      session.pushUpdate(layerId, newFeature, originalFeature);
      inputs.features.push(newFeature);
      removeMeasureTooltip({
        map,
        ...tooltip
      });
      tooltip = null;
      d.resolve(inputs);
    }
  });

  return d.promise();
};

proto.stop = function(){
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this._feature.setStyle(this._originalStyle);
  this.removeInteraction(this._modifyInteraction);
  this._modifyInteraction = null;
  return true;
};


proto._isNew = function(feature){
  return (!_.isNil(this.editingLayer.getEditingSource().getFeatureById(feature.getId())));
};

module.exports = ModifyGeometryVertexTask;
