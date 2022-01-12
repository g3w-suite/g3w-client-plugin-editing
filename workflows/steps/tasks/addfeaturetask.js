import SIGNALER_IIM_CONFIG from '../../../global_plugin_data';
const {base, inherit} =  g3wsdk.core.utils;
const GUI = g3wsdk.gui.GUI;
const {isSingleGeometry, singleGeometriesToMultiGeometry, findSelfIntersects} = g3wsdk.core.geoutils;
const Layer = g3wsdk.core.layer.Layer;
const Geometry = g3wsdk.core.geometry.Geometry;
const EditingTask = require('./editingtask');
const Feature = g3wsdk.core.layer.features.Feature;
const {createRegularPolygon, createBox} =  ol.interaction.Draw;
const {fromCircle} = ol.geom.Polygon;

function AddFeatureTask(options={}) {
  this._add = options.add === undefined ? true : options.add;
  this._busy = false;
  this.drawInteraction = null;
  this._snap = options.snap === false ? false : true;
  this._snapInteraction = null;
  this._finishCondition = options.finishCondition || _.constant(true);
  this._condition = options.condition || _.constant(true);
  this.layerId;
  base(this, options);
}

inherit(AddFeatureTask, EditingTask);

const proto = AddFeatureTask.prototype;

proto.setDrawInteraction = function({geometryFunction, type}={}){
  const originalGeometryType = this.originalLayer.getEditingGeometryType();
  const geometryType = type || Geometry.getOLGeometry(originalGeometryType);
  const source = this.editingLayer.getSource();
  const attributes = this.originalLayer.getEditingFields();
  const temporarySource = new ol.source.Vector();
  this.drawInteraction = new ol.interaction.Draw({
    type: geometryType,
    source: temporarySource,
    condition: this._condition,
    geometryFunction,
    freehandCondition: ol.events.condition.never,
    finishCondition: this._finishCondition
  });
  this.addInteraction(this.drawInteraction);
  this.drawInteraction.setActive(true);
  this.drawInteraction.on('drawend', evt => {
    if (evt.feature.getGeometry().getType() === 'Circle') evt.feature.setGeometry(ol.geom.Polygon.fromCircle(evt.feature.getGeometry()));
    if (isSingleGeometry(evt.feature.getGeometry())) evt.feature.setGeometry(singleGeometriesToMultiGeometry([evt.feature.getGeometry()]));
    if (Geometry.isPolygonGeometryType(evt.feature.getGeometry().getType()) && findSelfIntersects(evt.feature.getGeometry())){
      GUI.showUserMessage({
        type: 'warning',
        message: 'Self Intersection'
      });
      this.promise.reject();
    } else {
      let feature;
      if (this._add) {
        attributes.forEach(attribute => evt.feature.set(attribute.name, null));
        feature = new Feature({
          feature: evt.feature
        });
        feature.setTemporaryId();
        source.addFeature(feature);
        this.session.pushAdd(this.layerId, feature);
      } else feature = evt.feature;
      // set Z values based on layer geometry
      feature = Geometry.addZValueToOLFeatureGeometry({
        feature,
        geometryType: originalGeometryType
      });
      //add report id
      const {signaler_field, geo_layer_id, vertex_layer_id} = SIGNALER_IIM_CONFIG;
      this.layerId === geo_layer_id && feature.set(signaler_field, this.getEditingService().getCurrentReportData().id);
      const inputs = this.getInputs();
      inputs.features.push(feature);
      // in case of not geometry Point
      vertex_layer_id && this.getVertexToReportFeature(feature);
      /**
       * Method to get or add vertex to feature related to report
       */
      this.fireEvent('addfeature', feature); // emit event to get from subscribers
      this.promise.resolve(inputs);
    }
  });
};

proto.run = function(inputs, context) {
  this.promise = $.Deferred();
  const {current_shape_type} = inputs;
  this.originalLayer = inputs.layer;
  this.layerId = this.originalLayer.getId();
  this.editingLayer = this.originalLayer.getEditingLayer();
  this.session = context.session;
  switch (this.originalLayer.getType()) {
    case Layer.LayerTypes.VECTOR:
      current_shape_type ? this.changeDrawShapeStyle(current_shape_type) : this.setDrawInteraction();
      break;
  }
  return this.promise.promise();
};

/**
 * Method to change draw shape type
 * @param type
 */
proto.changeDrawShapeStyle = function(type) {
  this.removeInteraction(this.drawInteraction);
  if (type !== "Draw") {
    let geometryFunction;
    if (type === "Square") {
      type = "Circle";
      geometryFunction = createRegularPolygon(4);
    } else if (type === "Box") {
      type = "Circle";
      geometryFunction = createBox();
    } else if (type === "Triangle") {
      type = "Circle";
      geometryFunction = function(coordinates, geometry) {
        const center = coordinates[0];
        const last = coordinates[1];
        const dx = center[0] - last[0];
        const dy = center[1] - last[1];
        const radius = Math.sqrt(dx * dx + dy * dy);
        const rotation = Math.atan2(dy, dx);
        const newCoordinates = [];
        const numPoints = 3;
        for (let i = 0; i < numPoints; ++i) {
          const angle = rotation + (i * 2 * Math.PI) / numPoints;
          const fraction = i % 2 === 0 ? 1 : 0.5;
          const offsetX = radius * fraction * Math.cos(angle);
          const offsetY = radius * fraction * Math.sin(angle);
          newCoordinates.push([center[0] + offsetX, center[1] + offsetY]);
        }
        newCoordinates.push(newCoordinates[0].slice());
        if (!geometry) geometry = new ol.geom.Polygon([newCoordinates]);
        else geometry.setCoordinates([newCoordinates]);
        return geometry;
      };
    } else if (type === "Ellipse") {
      type = "Circle";
      geometryFunction = function(coordinates, geometry) {
        const center = coordinates[0];
        const last = coordinates[1];
        const dx = center[0] - last[0];
        const dy = center[1] - last[1];
        const radius = Math.sqrt(dx * dx + dy * dy);
        const circle = new ol.geom.Circle(center, radius);
        const polygon = fromCircle(circle, 64);
        polygon.scale(dx / radius, dy / radius);
        if (!geometry) geometry = polygon;
        else geometry.setCoordinates(polygon.getCoordinates());
        return geometry;
      };
    } else if (type === "Oblique Ellipse") {
      type = "LineString";
      geometryFunction = function(coordinates, geometry) {
        const center = coordinates[0];
        const first = coordinates[1];
        let dx = center[0] - first[0];
        let dy = center[1] - first[1];
        var radius1 = Math.sqrt(dx * dx + dy * dy);
        if (coordinates.length > 2) {
          const last = coordinates[2];
          dx = center[0] - last[0];
          dy = center[1] - last[1];
        }
        const radius2 = Math.sqrt(dx * dx + dy * dy);
        const rotation = Math.atan2(dy, dx);
        const circle = new ol.geom.Circle(center, radius1);
        const polygon = fromCircle(circle, 64);
        polygon.scale(radius2 / radius1, 1);
        polygon.rotate(rotation, center);
        if (!geometry) geometry = polygon;
        else geometry.setCoordinates(polygon.getCoordinates());
        return geometry;
      };
    }
    this.setDrawInteraction({geometryFunction, type});
  } else this.setDrawInteraction();
};

proto.getVertexToReportFeature = function(feature){
  const {geo_layer_id} = SIGNALER_IIM_CONFIG;
  if (this.layerId === geo_layer_id) {
    this.getEditingService().createVertexfromReportFeatures([feature]);
  }
};

proto.stop = function(inputs, context) {
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
