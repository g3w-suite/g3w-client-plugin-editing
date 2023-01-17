const { base, inherit }  = g3wsdk.core.utils;
const EditingTask = require('./editingtask');

function DeleteFeatureTask(options) {
  this.drawInteraction = null;
  this._selectInteraction = null;
  base(this, options);
}

inherit(DeleteFeatureTask, EditingTask);

const proto = DeleteFeatureTask.prototype;


proto.run = function(inputs, context) {
  return new Promise((resolve, reject) => {
    const originaLayer = inputs.layer;
    const layerId = originaLayer.getId();
    const session = context.session;
    const feature = inputs.features[0];
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
      session.pushDelete(layerId, feature);
      resolve(inputs);
    });
  })
};

proto.stop = function() {
  return new Promise((resolve, reject) => {
    resolve(true);
  })
};


module.exports = DeleteFeatureTask;
