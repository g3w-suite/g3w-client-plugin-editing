const {GUI} = g3wsdk.gui;
const {base, inherit} =  g3wsdk.core.utils;
const {within, convertSingleMultiGeometry} = g3wsdk.core.geoutils;
const {Geometry} = g3wsdk.core.geometry;
const {AreaInteraction, LengthInteraction} = g3wsdk.ol.interactions.measure;
const EditingTask = require('./editingtask');

function CreateHoleTask(options={}) {
  this.drawInteraction;
  this.drawingFeature;
  /**
   *
   * @param event
   * @returns {boolean|void}
   * @private
   * callback of pressing esc to remove last point drawed
   */
  this._delKeyRemoveLastPoint  = event => event.keyCode === 46 && this.removeLastPoint();
  base(this, options);
}

inherit(CreateHoleTask, EditingTask);

const proto = CreateHoleTask.prototype;

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const editingLayer = originalLayer.getEditingLayer();
  const session = context.session;
  const layerId = originalLayer.getId();
  const originalGeometryType = originalLayer.getEditingGeometryType();
  this.geometryType = Geometry.getOLGeometry(originalGeometryType);
  const source = editingLayer.getSource();
  this.drawInteraction = new ol.interaction.Draw({
    type: 'Polygon',
    source: new ol.source.Vector(),
    freehandCondition: ol.events.condition.never,
  });
  this.addInteraction(this.drawInteraction);

  this.drawInteraction.setActive(true);
  this.drawInteraction.on('drawstart', ({feature}) => {
    this.drawingFeature = feature;
    document.addEventListener('keydown', this._delKeyRemoveLastPoint);
  });
  this.drawInteraction.on('drawend', e => {
    const intersectFeature = source.getFeatures().find(feature => within(feature.getGeometry(), e.feature.getGeometry()));
    if ("undefined" !== typeof intersectFeature) {
      const originalFeature = intersectFeature.clone();
      //Get hole coordinates for polygon
      const coordinates = intersectFeature.getGeometry().getCoordinates();
      /**
       * @TODO check if MultiPolygon or Polygon
       */
      //Add hole coordinates to polygon and reset the polygon geometry
      coordinates[0].push(e.feature.getGeometry().getCoordinates()[0]);
      intersectFeature.getGeometry().setCoordinates(coordinates);
      session.pushUpdate(layerId, intersectFeature, originalFeature);

      inputs.features.push(intersectFeature);
      this.fireEvent('modify', intersectFeature); // emit event to get from subscribers

      d.resolve(inputs);
    } else {
      GUI.showUserMessage({
        type: 'warning',
        message: 'Ciao'
      })
      d.reject();
    }
  })
  return d.promise();
};

/**
 * Method to add Measure
 * @param geometryType
 */
proto.addMeasureInteraction = function(){
  const mapProjection = this.getMapService().getProjection();
  const measureOptions = {
    projection: mapProjection,
    drawColor: 'transparent',
    feature: this.drawingFeature
  };
  if (Geometry.isLineGeometryType(this.geometryType))
    this.measureInteraction = new LengthInteraction(measureOptions);
  else if (Geometry.isPolygonGeometryType(this.geometryType))
    this.measureInteraction = new AreaInteraction(measureOptions);
  if (this.measureInteraction){
    this.measureInteraction.setActive(true);
    this.addInteraction(this.measureInteraction);
  }
};

/**
 * Remove Measure Interaction
 */
proto.removeMeasureInteraction = function(){
  if (this.measureInteraction) {
    this.measureInteraction.clear();
    this.removeInteraction(this.measureInteraction);
    this.measureInteraction = null;
  }
};

proto.stop = function() {
  this.removeInteraction(this.drawInteraction);
  this.removeMeasureInteraction();
  this.drawInteraction = null;
  this.drawingFeature = null;
  document.removeEventListener('keydown', this._delKeyRemoveLastPoint);
  return true;
};

proto.removeLastPoint = function() {
  if (this.drawInteraction) {
    try {
      this.drawInteraction.removeLastPoint();
    }
    catch (err) {
      console.log(err)
    }
  }
};

module.exports = CreateHoleTask;
