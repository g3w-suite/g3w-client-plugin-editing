const inherit = g3wsdk.core.utils.inherit;
const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const base =  g3wsdk.core.utils.base;
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
  switch (originalLayer.getType()) {
    case Layer.LayerTypes.VECTOR:
      let geometryType = originalLayer.getEditingGeometryType();
      switch (geometryType) {
        case Geometry.GeometryTypes.LINESTRINGZ:
        case Geometry.GeometryTypes.LINESTRINGM:
        case Geometry.GeometryTypes.LINESTRINGZM:
        case Geometry.GeometryTypes.LINESTRING25D:
        case Geometry.GeometryTypes.LINE:
        case Geometry.GeometryTypes.LINEZ:
        case Geometry.GeometryTypes.LINEM:
        case Geometry.GeometryTypes.LINEZM:
        case Geometry.GeometryTypes.LINE25D:
          geometryType = 'LineString';
          break;
        case Geometry.GeometryTypes.MULTILINESTRINGZ:
        case Geometry.GeometryTypes.MULTILINESTRINGM:
        case Geometry.GeometryTypes.MULTILINESTRINGZM:
        case Geometry.GeometryTypes.MULTILINESTRING25D:
        case Geometry.GeometryTypes.MULTILINE:
        case Geometry.GeometryTypes.MULTILINEZ:
        case Geometry.GeometryTypes.MULTILINEM:
        case Geometry.GeometryTypes.MULTILINEZM:
        case Geometry.GeometryTypes.MULTILINE25D:
          geometryType = 'MultiLineString';
          break;
        case Geometry.GeometryTypes.POINTZ:
        case Geometry.GeometryTypes.POINTM:
        case Geometry.GeometryTypes.POINTZM:
        case Geometry.GeometryTypes.POINT25D:
          geometryType = 'Point';
          break;
        case Geometry.GeometryTypes.MULTIPOINTZ:
        case Geometry.GeometryTypes.MULTIPOINTM:
        case Geometry.GeometryTypes.MULTIPOINTZM:
        case Geometry.GeometryTypes.MULTIPOINT25D:
          geometryType = 'MultiPoint';
          break;
        case Geometry.GeometryTypes.POLYGONZ:
        case Geometry.GeometryTypes.POLYGONM:
        case Geometry.GeometryTypes.POLYGONZM:
        case Geometry.GeometryTypes.POLYGON25D:
          geometryType = 'Polygon';
          break;
        case Geometry.GeometryTypes.MULTIPOLYGONZ:
        case Geometry.GeometryTypes.MULTIPOLYGONM:
        case Geometry.GeometryTypes.MULTIPOLYGONZM:
        case Geometry.GeometryTypes.MULTIPOLYGON25D:
          geometryType = 'MultiPolygon';
          break;
      }
      const source = editingLayer.getSource();
      const attributes = originalLayer.getEditingFields();
      const temporarySource = new ol.source.Vector();
      this.drawInteraction = new ol.interaction.Draw({
        type: geometryType,
        source: temporarySource,
        condition: this._condition,
        freehandCondition: ol.events.condition.never,
        finishCondition: this._finishCondition
      });
      this.addInteraction(this.drawInteraction);
      this.drawInteraction.setActive(true);
      this.drawInteraction.on('drawend', (e) => {
        let feature;
        if (this._add) {
          attributes.forEach(attribute => {
            e.feature.set(attribute.name, null);
          });
          feature = new Feature({
            feature: e.feature,
          });
          feature.setTemporaryId();
          source.addFeature(feature);
          session.pushAdd(layerId, feature);
        } else feature = e.feature;
        inputs.features.push(feature);
        this.fireEvent('addfeature', feature); // emit event to get from subscribers
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
