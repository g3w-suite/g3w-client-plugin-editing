const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const RelationComponent = require('./components/relation/vue/relation');
const EdtingFormService = function(options={}) {
  const EditingService = require('../services/editingservice');
  this.state = {
    relations: []
  };
  // riceve gli inpust del form principale
  const {layer, features} = options.inputs || {};
  // riceve l'event bus del form pricipale
  this._formEventBus = options.formEventBus || null;
  // sono le relazioni effettive presenti
  let relations = [];
  const layerId = layer.getId();
  const feature = features[features.length - 1];
  if (layer.isFather()) {
    // recupero l'array delle relazioni
    relations = layer.getRelations().getArray();
    // vado a filtrare le relazioni per quelle che sono effettivamente in editing
    relations = EditingService.getRelationsInEditing({
      layerId,
      relations,
      feature,
      isNew: feature.isNew()
    });
  }
  this.hasRelations = function() {
    return !!relations.length;
  };
  // funzione che mi serve per costruire il componente vue da innestare dentro il form
  // come componente relations
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
        id: `${t("editing.edit_relation")} ${relation.relation.name}`,
        component: relationComponent
      })
    });
    return relationComponents;
  };
};

module.exports =  EdtingFormService;
