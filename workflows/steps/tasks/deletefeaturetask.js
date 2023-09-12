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
  const d = $.Deferred();
  const originaLayer = inputs.layer;
  const layerId = originaLayer.getId();
  const session = context.session;
  const feature = inputs.features[0];
  const EditingService = require('../../../services/editingservice');
  const RelationService = require('../../../services/relationservice');

  const relations = EditingService._filterRelationsInEditing({
    layerId,
    relations: originaLayer.getRelations() ?
      originaLayer.getRelations().getArray() :
      []
  }).filter(relation => {
    //get Relation Id
    const relationId = EditingService._getRelationId({
      layerId,
      relation
    });

    const relationLayer = EditingService.getLayerById(relationId);

    const {ownField} = EditingService._getRelationFieldsFromRelation({
      layerId: relationId,
      relation
    });

    //Exclude relation child layer that has at least one
    //editing field required because when unlink relation feature from
    // delete father, when try to commit update relation, we receive an error
    //due missing value /null to required field.

    return ownField.reduce((bool, oField) => {
      const field = relationLayer.getEditingFields()
        .find((field) => field.name === oField);
      return bool || !field.validate.required;
    }, false)

  });

  const promise = relations.length > 0 ?
    EditingService.getLayersDependencyFeatures(layerId, {feature, relations}) :
    Promise.resolve();

  //promise return features relations and add to relation layer child
  promise.then(() => {

    //get data features
    const relationsInEditing = EditingService.getRelationsInEditing({
      layerId,
      relations,
      feature,
    });

    inputs.features = [feature];

    relationsInEditing.forEach(relationInEditing => {
      //relation is an instance of Relation.
      //relations are relations features
      const {relation, relations} = relationInEditing;

      const relationService = new RelationService(layerId, {
        relation,
        relations
      });

      const relationsLength = relations.length;

      //Unlink relation features related to layer id
      for (let index = 0; index < relationsLength ; index++) {
        //unlink
        relationService.unlinkRelation(0, false)
      }
    });

    session.pushDelete(layerId, feature);

    d.resolve(inputs);
  });

  return d.promise();
};

proto.stop = function() {
  return new Promise((resolve, reject) => {
    resolve(true);
  })
};


module.exports = DeleteFeatureTask;
