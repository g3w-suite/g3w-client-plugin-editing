const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const {areCoordinatesEqual} = g3wsdk.core.geoutils;
const EditingTask = require('./editingtask');

function GetVertexTask(options={}) {
  this._drawInteraction;
  this._snapIteraction;
  base(this, options);
}

inherit(GetVertexTask, EditingTask);

const proto = GetVertexTask.prototype;

proto.run = function(inputs) {
  const d = $.Deferred();
  const {features} = inputs;
  if (!features.length) return;
  const geometryType = features[0].getGeometry().getType();
  this._snapIteraction = new ol.interaction.Snap({
    features: new ol.Collection(features),
    edge: false
  });
  this._drawIteraction = new ol.interaction.Draw({
    type: 'Point',
    condition: function(evt) {
      const coordinates = evt.coordinate;
      return !!features.find((feature) => {
        const featureGeometry = feature.getGeometry();
        let featureCoordinates;
        switch (geometryType){
          case 'MultiLineString':
            featureCoordinates = featureGeometry.getCoordinates();
            return areCoordinatesEqual(coordinates, featureCoordinates);
            break;
          case 'LineString':
            return !!featureGeometry.getCoordinates().find(f_coordinates => {
              return areCoordinatesEqual(coordinates, f_coordinates);
            })
            break;
          case 'Polygon':
            return !!_.flatMap(featureGeometry.getCoordinates()).find(f_coordinates => {
              return areCoordinatesEqual(coordinates, f_coordinates);
            })
            break;
          case 'MultiPolygon':
            return !!featureGeometry.getPolygons().find(polygon =>{
              return !!_.flatMap(polygon.getCoordinates()).find(f_coordinates => {
                return areCoordinatesEqual(coordinates, f_coordinates)
              })
            })
            break;
          case 'Point':
            return areCoordinatesEqual(coordinates, featureGeometry.getCoordinates());
            break;
          case 'MultiPoint':
            return !!featureGeometry.getCoordinates().find(f_coordinates =>{
              return areCoordinatesEqual(coordinates, f_coordinates)
            })
            break;
        }
      })
    }
  });

  this._drawIteraction.on('drawend', (evt)=> {
    inputs.coordinates = evt.feature.getGeometry().getCoordinates();
    this.setUserMessageStepDone('from')
    d.resolve(inputs);
  });

  this.addInteraction(this._drawIteraction);
  this.addInteraction(this._snapIteraction);

  return d.promise();
};

proto.stop = function() {
  this.removeInteraction(this._drawIteraction);
  this.removeInteraction(this._snapIteraction);
  this._snapIteraction = null;
  this._drawIteraction = null;
};

module.exports = GetVertexTask;
