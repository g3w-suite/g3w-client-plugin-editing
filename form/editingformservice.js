const {GUI} = g3wsdk.gui;
const t = g3wsdk.core.i18n.tPlugin;
const RelationComponent = require('./components/relation/vue/relation');
const EditingFormService = function(options={}) {
  const EditingService = require('../services/editingservice');
  this.state = {
    relations: []
  };
  const {layer, features} = options.inputs || {};
  this._formEventBus = options.formEventBus || null;
  const layerId = layer.getId();
  // get feature
  const feature = features[features.length - 1];
  // get only relation with type not ONE and layer is the father
  let relations = layer.getRelations().getArray().filter(relation => relation.getType() !== 'ONE' && relation.getFather() === layerId);
  relations = EditingService.getRelationsInEditing({layerId, relations , feature});
  this.hasRelations = () => !!relations.length;
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
        }
      });
      relationComponents.push({
        title: "plugins.editing.edit_relation",
        name: relation.relation.name,
        relation_id: relation.relation.id,
        id: `${t("editing.edit_relation")} ${relation.relation.name}`,
        header: false, // not sho to header
        component: relationComponent
      })
    });
    return relationComponents;
  };
};

module.exports =  EditingFormService;
