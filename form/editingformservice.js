const {GUI} = g3wsdk.gui;
const RelationComponent = require('../components/FormRelation.vue');
const EditingFormService = function(options={}) {
  const EditingService = require('../services/editingservice');
  this.state = {
    relations: []
  };
  const {layer, features} = options.inputs || {};
  // get back to Father function
  this._formEventBus = options.formEventBus || null;
  const layerId = layer.getId();
  // get feature
  const feature = features[features.length - 1];
  // get only relation with type not ONE and layer is the father
  let relations = layer.getRelations().getArray().filter(relation => relation.getType() !== 'ONE' && relation.getFather() === layerId);
  /**
   * get relation layers that set in editing on g3w-admin
   */
  relations = EditingService.getRelationsInEditing({layerId, relations , feature});
  this.hasRelations = () => relations.length > 0;
  this.buildRelationComponents = function() {
    const self = this;
    const relationComponents = [];
    relations.forEach(relation => {
      const relationComponent = Vue.extend({
        mixins: [RelationComponent],
        name: `relation_${Date.now()}`,
        methods: {
          getService() {
            return self._relationsService;
          }
        },
        data() {
          return {
            layerId,
            relation: relation.relation,
            relations: relation.relations,
            resourcesurl: GUI.getResourcesUrl(),
            formeventbus: self._formEventBus
          }
        },
      });
      relationComponents.push({
        title: "plugins.editing.edit_relation",
        name: relation.relation.name,
        id: relation.relation.id,
        header: false, // not show to header form
        component: relationComponent
      })
    });
    return relationComponents;
  };
};

module.exports =  EditingFormService;
