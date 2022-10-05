const {base, inherit} = g3wsdk.core.utils;
const {createMeasureTooltip, removeMeasureTooltip} = g3wsdk.ol.utils;
const EditingTask = require('./editingtask');

function ModifyGeometryVertexTask(options={}){
  this.drawInteraction = null;
  this._originalStyle = null;
  this._feature = null;
  this.tooltip;
  this._deleteCondition = options.deleteCondition;
  base(this, options);
}

inherit(ModifyGeometryVertexTask, EditingTask);

const proto = ModifyGeometryVertexTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer() ;
  const session = context.session;
  const layerId = originalLayer.getId();
  let newFeature, originalFeature;
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
  this._modifyInteraction.on('modifystart', evt => {
    const feature = evt.features.getArray()[0];
    originalFeature = feature.clone();
  });
  this.addInteraction(this._modifyInteraction);
  this._modifyInteraction.on('modifyend', evt => {
    const feature = evt.features.getArray()[0];
    if (feature.getGeometry().getExtent() !== originalFeature.getGeometry().getExtent()) {
      /*
      * evaluate expression geometry check
       */
      this.evaluateGeometryExpressionField({
        inputs,
        feature,
      });
      /**
       *
       * end of evaluate
       */
      newFeature = feature.clone();
      session.pushUpdate(layerId, newFeature, originalFeature);
      inputs.features.push(newFeature);
      d.resolve(inputs);
    }
  });
  return d.promise();
};

proto.addMeasureInteraction = function(){
  const map = this.getMap();
  this._modifyInteraction.on('modifystart', evt => {
    const feature = evt.features.getArray()[0];
    this.tooltip = createMeasureTooltip({
      map,
      feature
    });
  });
};

proto.removeMeasureInteraction = function(){
  const map = this.getMap();
  this.tooltip && removeMeasureTooltip({
    map,
    ...this.tooltip
  });
  this.tooltip = null;
};


proto.stop = function(){
  this._feature.setStyle(this._originalStyle);
  this.removeInteraction(this._modifyInteraction);
  return true;
};


module.exports = ModifyGeometryVertexTask;
