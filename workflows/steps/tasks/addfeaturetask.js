const inherit = g3wsdk.core.utils.inherit;
const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');
const Feature = g3wsdk.core.layer.features.Feature;

function AddFeatureTask(options={}) {
  this._busy = false;
  this.drawInteraction = null;
  this._snap = options.snap===false ? false : true;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);

  base(this, options);
}

inherit(AddFeatureTask, EditingTask);

const proto = AddFeatureTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer();
  const session = context.session;
  const layerId = originalLayer.getId();
  const pk = originalLayer.getPk();
  switch (originalLayer.getType()) {
    case Layer.LayerTypes.VECTOR:
      let geometryType;
      if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.LINE)
        geometryType = 'LineString';
      else if (originalLayer.getEditingGeometryType() === Geometry.GeometryTypes.MULTILINE)
        geometryType = 'MultiLineString';
      else
        geometryType = originalLayer.getEditingGeometryType();
      const source = editingLayer.getSource();
      const attributes = originalLayer.getEditingFields();
      const temporarySource = new ol.source.Vector();
      this.drawInteraction = new ol.interaction.Draw({
        type: geometryType,
        source: temporarySource,
        condition: this._condition,
        finishCondition: this._finishCondition
      });

      this.addInteraction(this.drawInteraction);
      this.drawInteraction.setActive(true);
      this.drawInteraction.on('drawstart',function(e) {
      });
      this.drawInteraction.on('drawend', function(e) {
        attributes.forEach((attribute) => {
          e.feature.set(attribute.name, null);
        });
        const feature = new Feature({
          feature: e.feature,
          pk
        });
        originalLayer.isPkEditable() ?  feature.setNew() : feature.setTemporaryId();
        source.addFeature(feature);
        const newFeature = session.pushAdd(layerId, feature);
        inputs.newFeature = newFeature;
        inputs.features.push(feature);
        d.resolve(inputs);
      });
      break;
  }
  return d.promise();
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
