const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const DeleteInteraction = g3wsdk.ol.interactions.DeleteFeatureInteraction;
const EditingTask = require('./editingtask');

function DeleteFeatureTask(options={}) {
  this.drawInteraction = null;
  this._selectInteraction = null;
  this._dependency = options.dependency;
  base(this, options);
}

inherit(DeleteFeatureTask, EditingTask);


const proto = DeleteFeatureTask.prototype;

/* BRUTTISSIMO! */

ol.geom.GeometryType = {
  POINT: 'Point',
  LINE: 'Line',
  LINE_STRING: 'LineString',
  LINEAR_RING: 'LinearRing',
  POLYGON: 'Polygon',
  MULTI_POINT: 'MultiPoint',
  MULTI_LINE_STRING: 'MultiLineString',
  MULTI_POLYGON: 'MultiPolygon',
  GEOMETRY_COLLECTION: 'GeometryCollection',
  CIRCLE: 'Circle'
};


const white = [255, 255, 255, 1];
const red = [255, 0, 0, 1];
const width = 3;

//vado a definre lo stile della feature selezionata per essere cancellata
const styles = {};
styles[ol.geom.GeometryType.POLYGON] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'red',
      width: 3
    }),
    fill: new ol.style.Fill({
      color: 'rgba(255, 0, 0, 0.1)'
    })
  })
];
styles[ol.geom.GeometryType.MULTI_POLYGON] = styles[ol.geom.GeometryType.POLYGON];

styles[ol.geom.GeometryType.LINE] = styles[ol.geom.GeometryType.LINE_STRING] = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: white,
      width: width + 2
    })
  }),
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: red,
      width: width
    })
  })
];

styles[ol.geom.GeometryType.MULTI_LINE_STRING] = styles[ol.geom.GeometryType.LINE_STRING];

styles[ol.geom.GeometryType.CIRCLE] = styles[ol.geom.GeometryType.POLYGON].concat(styles[ol.geom.GeometryType.LINE_STRING]);

styles[ol.geom.GeometryType.POINT] = [
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: width * 2,
      fill: new ol.style.Fill({
        color: red
      }),
      stroke: new ol.style.Stroke({
        color: white,
        width: width / 2
      })
    }),
    zIndex: Infinity
  })
];
styles[ol.geom.GeometryType.MULTI_POINT] = styles[ol.geom.GeometryType.POINT];

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = styles[ol.geom.GeometryType.POLYGON].concat(styles[ol.geom.GeometryType.LINE_STRING], styles[ol.geom.GeometryType.POINT]);

styles[ol.geom.GeometryType.POLYGON] = _.concat(styles[ol.geom.GeometryType.POLYGON],styles[ol.geom.GeometryType.LINE_STRING]);

styles[ol.geom.GeometryType.GEOMETRY_COLLECTION] = _.concat(styles[ol.geom.GeometryType.GEOMETRY_COLLECTION],styles[ol.geom.GeometryType.LINE_STRING]);


// run del tool di delete feature
// che ritorna una promessa
proto.run = function(inputs, context) {
  //console.log('Delete task run.......');
  const d = $.Deferred();
  const editingLayer = inputs.layer;
  const features = editingLayer.getSource().getFeatures();
  const originaLayer = context.layer;
  const layerId = originaLayer.getId();
  const isBranchLayer = this.isBranchLayer(layerId);
  const geometryType = originaLayer.getGeometryType();
  //recupero la sessione dal context
  const session = context.session;
  this._selectInteraction = new ol.interaction.Select({
    layers: [editingLayer],
    condition: ol.events.condition.click,
    //multi: true,
    filter: isBranchLayer ? (feature) => {
      const coordinate = feature.getGeometry().getCoordinates();
      let coordinateString = [coordinate[0].toString(), coordinate[1].toString()];
      for (let i = 0; i < features.length; i++ ) {
        const _feature = features[i];
        if (feature !== _feature) {
          const _coordinate = _feature.getGeometry().getCoordinates();
          const foundIndex = coordinateString.findIndex((StringCoordinate) => {
            return StringCoordinate === _coordinate[0].toString() ||  StringCoordinate === _coordinate[1].toString();
          });
          if (foundIndex !== -1) {
            coordinateString.splice(foundIndex, 1);
            if (!coordinateString.length) break;
          }
        }
      }
      return !!coordinateString.length ? ol.events.condition.click: false;
    }: ol.events.condition.always,
    style() {
      return styles[geometryType];
    }
  });
  this.addInteraction(this._selectInteraction);
  this._deleteInteraction = new DeleteInteraction({
    features: this._selectInteraction.getFeatures(), // passo le features selezionate
    layer: editingLayer // il layer appartenente
  });
  this.addInteraction(this._deleteInteraction);
  this._deleteInteraction.on('deleteend', (e) => {
    const feature = e.features.getArray()[0];
    inputs.features = [feature];
    // vado a cancellare dalla source la feature selezionata
    editingLayer.getSource().removeFeature(feature);
    this._selectInteraction.getFeatures().remove(feature);
    // dico di cancellarla (la feature non viene cancellatata ma aggiornato il suo stato)
    session.pushDelete(layerId, feature);
    if (isBranchLayer) {
      this.runBranchMethods({
        action: 'delete',
        layerId,
        session,
        feature
      })
    }
    d.resolve(inputs);
  });
  return d.promise();
};

proto.stop = function() {
  //console.log('Stop delete task ....');
  return new Promise((resolve, reject) => {
    this._selectInteraction.getFeatures().clear();
    this.removeInteraction(this._selectInteraction);
    this._selectInteraction = null;
    // funzione che mi fa il resete di tuttle le modalità inserite dall'interazione
    this._deleteInteraction.clear();
    this.removeInteraction(this._deleteInteraction);
    this._deleteInteraction = null;
    resolve(true);
  })
};


module.exports = DeleteFeatureTask;
