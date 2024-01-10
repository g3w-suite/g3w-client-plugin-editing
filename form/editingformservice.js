const { GUI }            = g3wsdk.gui;
const RelationComponent  = require('../components/FormRelation.vue');

const EditingFormService = function(options = {}) {

  const EditingService = require('../services/editingservice');

  this.state = {
    relations: []
  };

  const { layer, features } = options.inputs || {};

  /**
   * get back to Father function
   */
  this._formEventBus = options.formEventBus || null;

  const layerId = layer.getId();

  // get only relation with type not ONE and layer is the father
  let relations = layer
    .getRelations()
    .getArray()
    .filter(relation => relation.getType() !== 'ONE' && relation.getFather() === layerId);

  // get relation layers that set in editing on g3w-admin
  relations = EditingService.getRelationsInEditing({
    layerId,
    relations ,
    feature: features[features.length - 1],
  });

  this.hasRelations = () => relations.length > 0;

  this.buildRelationComponents = function() {

    const self = this;

    const relationComponents = [];

    relations
      .forEach(({ relation, relations }) => {
        const relationComponent = Vue.extend({
          mixins: [ RelationComponent ],
          name: `relation_${Date.now()}`,
          methods: {
            getService() {
              return self._relationsService;
            }
          },
          data() {
            return {
              layerId,
              relation,
              relations,
              resourcesurl: GUI.getResourcesUrl(),
              formeventbus: self._formEventBus
            };
          },
        });

      relationComponents.push({
        title:     "plugins.editing.edit_relation",
        name:      relation.name,
        id:        relation.id,
        header:    false,            // hide header form
        component: relationComponent
      })
    });

    return relationComponents;

  };

};

module.exports = EditingFormService;
