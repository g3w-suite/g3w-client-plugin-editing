const {base, inherit} =  g3wsdk.core.utils;
const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const EditingTask = require('./editingtask');
const Feature = g3wsdk.core.layer.features.Feature;

function AddFeatureTask(options={}) {
  this._add = options.add === undefined ? true : options.add;
  this._busy = false;
  this.drawInteraction = null;
  this._snap = options.snap===false ? false : true;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);
  this.layerId;
  base(this, options);
}

inherit(AddFeatureTask, EditingTask);

const proto = AddFeatureTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer();
  const session = context.session;
  this.layerId = originalLayer.getId();
  switch (originalLayer.getType()) {
    case Layer.LayerTypes.VECTOR:
      const originalGeometryType = originalLayer.getEditingGeometryType();
      const geometryType = Geometry.getOLGeometry(originalGeometryType);
      const source = editingLayer.getSource();
      const attributes = originalLayer.getEditingFields();
      const temporarySource = new ol.source.Vector();
      this.drawInteraction = new ol.interaction.Draw({
        type: geometryType,
        source: temporarySource,
        condition: this._condition,
        geometryFunction: null,
        freehandCondition: ol.events.condition.never,
        finishCondition: this._finishCondition
      });
      this.addInteraction(this.drawInteraction);
      this.drawInteraction.setActive(true);
      this.drawInteraction.on('drawend', e => {
        let feature;
        if (this._add) {
          attributes.forEach(attribute => e.feature.set(attribute.name, null));
          feature = new Feature({
            feature: e.feature
          });
          feature.setTemporaryId();
          source.addFeature(feature);
          session.pushAdd(this.layerId, feature);
        } else feature = e.feature;
        // set Z values based on layer Geoemtry
        feature = Geometry.addZValueToOLFeatureGeometry({
          feature,
          geometryType: originalGeometryType
        });
        //add report id
        if (this.layerId === this.getEditingService().getLayerFeaturesId()){
          feature.set('report_id', this.getEditingService().getCurrentReportData().id);
        }
        inputs.features.push(feature);
        this.getVertexToReportFeature(feature);
        /**
         * Method to get or add vertex to feature related to report
         */

        this.fireEvent('addfeature', feature); // emit event to get from subscribers
        d.resolve(inputs);
      });
      break;
  }
  return d.promise();
};

proto.changeDrawShapeStyle = function(type){

};

proto.getVertexToReportFeature = function(feature){
  if (this.layerId === this.getEditingService().getLayerFeaturesId()) {
    this.getEditingService().createVertexfromReportFeatures([feature]);
  }
};

proto.stop = function() {
  if (this._snapInteraction) {
     this.removeInteraction(this._snapInteraction);
     this._snapInteraction = null;
  }
  this.removeInteraction(this.drawInteraction);
  this.drawInteraction = null;
  return true;
};

proto._removeLastPoint = function() {
  if (this.drawInteraction) {
    try {
      this.drawInteraction.removeLastPoint();
    }
    catch (err) {
      console.log(err)
    }
  }
};

module.exports = AddFeatureTask;
