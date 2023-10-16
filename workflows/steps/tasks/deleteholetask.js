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
const EditingTask = require('./editingtask');

function DeleteHoleTask(options={}) {
  this.drawInteraction;
  this.snapInteraction;
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

inherit(DeleteHoleTask, EditingTask);

const proto = DeleteHoleTask.prototype;

/**
 * @TODO
 * @param holeFeature
 * @returns {{newFeature, originalFeature}}
 */
proto.createHole = function(holeFeature, editingLayerSource){
  // In case of MultiPolygon
  let newFeature;
  let originalFeature;

  if (isMultiGeometry(this.geometryType)) {
    // cycle on each MultiPolygon feature of layer Multipolygon
    editingLayerSource.getFeatures().find((feature) => {
      //feature is a multipolygon
      //find single polygon of multipolygon that contain draw hole
      const findPolygonIndex = feature.getGeometry().getCoordinates().findIndex((singlePolygonCoordinates) => {
        const featurePolygonGeometry = coordinatesToGeometry('Polygon', singlePolygonCoordinates)
        return within(featurePolygonGeometry, holeFeature.getGeometry())
      })
      if (findPolygonIndex !== -1) {
        originalFeature = feature.clone();
        newFeature = feature;
        const coordinates = newFeature.getGeometry().getCoordinates();
        coordinates[findPolygonIndex].push(holeFeature.getGeometry().getCoordinates()[0]);
        newFeature.getGeometry().setCoordinates(coordinates);
        return true;
      }
    });
  } else { // In case of Polygon
    newFeature = editingLayerSource.getFeatures().find(feature => {
      return within(feature.getGeometry(), holeFeature.getGeometry())
    });

    if ("undefined" !== typeof newFeature) {
      originalFeature = newFeature.clone();
      //Get hole coordinates for polygon
      const coordinates = newFeature.getGeometry().getCoordinates();
      coordinates.push(holeFeature.getGeometry().getCoordinates()[0]);
      newFeature.getGeometry().setCoordinates(coordinates);
    }
  }
  return {
    newFeature,
    originalFeature
  }
}

proto.run = function(inputs, context) {
  const d = $.Deferred();
  const originalLayer = inputs.layer;
  const session = context.session;
  const layerId = originalLayer.getId();
  const originalGeometryType = originalLayer.getEditingGeometryType();
  this.geometryType = Geometry.getOLGeometry(originalGeometryType);
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
    // IN CASE OF Z VALUE OF COORDINATE ADD Z VALUE TO COORDINATES OF DRAW POLYGON HOLE
    if (is3DGeometry(this.geometryType)) {
      evt.feature.setGeometry(addZValueToOLFeatureGeometry(evt.feature.getGeometry()))
    }
    const {newFeature, originalFeature} = this.createHole(evt.feature, originalLayer.getEditingLayer().getSource());

    if ("undefined" !== typeof newFeature) {
      session.pushUpdate(layerId, newFeature, originalFeature);

      inputs.features.push(newFeature);

      this.fireEvent('modify', newFeature); // emit event to get from subscribers

      d.resolve(inputs);
    } else {
      GUI.showUserMessage({
        type: 'warning',
        message: 'Ciao'
      })
      d.reject();
    }
  })

  this.snapInteraction = new ol.interaction.Snap({
    source: originalLayer.getEditingLayer().getSource()
  });

  this.addInteraction(this.snapInteraction);
  return d.promise();
};

proto.stop = function() {
  this.removeInteraction(this.drawInteraction);
  this.removeInteraction(this.snapInteraction);
  this.drawInteraction = null;
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

module.exports = DeleteHoleTask;
