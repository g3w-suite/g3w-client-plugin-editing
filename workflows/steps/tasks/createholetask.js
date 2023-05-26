const {GUI} = g3wsdk.gui;
const {base, inherit} =  g3wsdk.core.utils;
const {
  within,
  Geometry: {
    isMultiGeometry,
    is3DGeometry,
    addZValueToOLFeatureGeometry
  },
  coordinatesToGeometry
} = g3wsdk.core.geoutils;
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
  this.drawInteraction.on('drawend', (evt) => {
    let intersectFeature, originalFeature;
    // In case of MultiPolygon
    if (isMultiGeometry(this.geometryType)) {
      // cycle on each Polygon of MutiPolygon
      source.getFeatures().find((feature) => {
        const findPolygonIndex = feature.getGeometry().getCoordinates().findIndex((singlePolygonCoordinates) => {
          const featurePolygonGeometry = coordinatesToGeometry('Polygon', singlePolygonCoordinates)
          return within(featurePolygonGeometry, evt.feature.getGeometry())
        })
        if (findPolygonIndex !== -1) {
          intersectFeature = feature.getGeometry().getCoordinates()
          return true;
        }

      });
      const coordinates = intersectFeature.getGeometry().getCoordinates();
      coordinates[0].push(evt.feature.getGeometry().getCoordinates()[0]);
      intersectFeature.getGeometry().setCoordinates(coordinates);

    } else { // In case of Polygon

      intersectFeature = source.getFeatures().find(feature => {
        return within(feature.getGeometry(), evt.feature.getGeometry())
      });
      originalFeature = intersectFeature.clone();
      //Get hole coordinates for polygon
      const coordinates = intersectFeature.getGeometry().getCoordinates();
      coordinates.push(evt.feature.getGeometry().getCoordinates());
      intersectFeature.getGeometry().setCoordinates(coordinates);
    }

    if ("undefined" !== typeof intersectFeature) {
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
