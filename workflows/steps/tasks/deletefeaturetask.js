const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
const EditingTask = require('./editingtask');

function DeleteFeatureTask(options) {
  this.drawInteraction = null;
  this._selectInteraction = null;
  base(this, options);
}

inherit(DeleteFeatureTask, EditingTask);


const proto = DeleteFeatureTask.prototype;

ol.geom.GeometryType = {
  POINT: 'Point',
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

styles[ol.geom.GeometryType.LINE_STRING] = [
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

proto.run = function(inputs, context) {
  this.registerPointerMoveCursor();
  const d = $.Deferred();
  const originaLayer = inputs.layer;
  const editingLayer = originaLayer.getEditingLayer();
  const layerId = originaLayer.getId();
  const session = context.session;
  this._selectInteraction = new ol.interaction.Select({
    layers: [editingLayer],
    //condition: ol.events.condition.doubleClick,
    style(feature) {
      const style = styles[feature.getGeometry().getType()];
      return style;
    }
  });

  this.addInteraction(this._selectInteraction);
  this._selectInteraction.on('select', e => {
    const feature = e.selected[0];
    const EditingService = require('../../../services/editingservice');
    const RelationService = require('../../../services/relationservice');
    const relations = EditingService._filterRelationsInEditing({
      layerId,
      relations: originaLayer.getRelations() ? originaLayer.getRelations().getArray() : []
    }).filter(relation => {
      const relationId = EditingService._getRelationId({
        layerId,
        relation
      });
      const relationLayer = EditingService.getLayerById(relationId);
      const {ownField} = EditingService._getRelationFieldsFromRelation({
        layerId: relationId,
        relation
      });
      const field = relationLayer.getEditingFields().find((field) => {
        return field.name === ownField;
      });
      return !field.validate.required;
    });
    const promise = relations.length ? EditingService.getLayersDependencyFeatures(layerId, {
      feature,
      relations
    }) : Promise.resolve();
    promise.then(() => {
      const relationsInEditing = EditingService.getRelationsInEditing({
        layerId,
        relations,
        feature,
      });
      inputs.features = [feature];
      relationsInEditing.forEach((relationInEditing) => {
        const {relation, relations} = relationInEditing;
        const relationService = new RelationService(layerId, {
          relation,
          relations
        });
        const relationsLength = relations.length;
        for (let index = 0; index < relationsLength ; index++) {
          relationService.unlinkRelation(0, false)
        }
      });
      editingLayer.getSource().removeFeature(feature);
      this._selectInteraction.getFeatures().remove(feature);
      session.pushDelete(layerId, feature);
      d.resolve(inputs);
    })
  });

  return d.promise();
};

proto.stop = function() {
  return new Promise((resolve, reject) => {
    this._selectInteraction.getFeatures().clear();
    this.removeInteraction(this._selectInteraction);
    this.unregisterPointerMoveCursor();
    this._selectInteraction = null;
    resolve(true);
  })
};


module.exports = DeleteFeatureTask;
