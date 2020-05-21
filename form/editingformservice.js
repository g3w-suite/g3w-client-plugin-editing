const GUI = g3wsdk.gui.GUI;
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
  const feature = features[features.length - 1];
  const relations = layer.isFather() ? EditingService.getRelationsInEditing({layerId, relations: layer.getRelations().getArray(), feature}) : [];
  this.hasRelations = function() {
    return !!relations.length;
  };
  this.buildRelationComponents = function() {
    const self = this;
    const relationComponents = [];
    relations.forEach((relation) => {
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
        id: `${t("editing.edit_relation")} ${relation.relation.name}`,
        component: relationComponent
      })
    });
    return relationComponents;
  };
};

module.exports =  EditingFormService;
