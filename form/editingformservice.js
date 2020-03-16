const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const RelationComponent = require('./components/relation/vue/relation');
const EdtingFormService = function(options={}) {
  const EditingService = require('../services/editingservice');
  this.state = {
    relations: []
  };
  // riceve il context del form principale
  this._context = options.context || {};
  // riceve gli inpust del form principale
  this._inputs = options.inputs || {};
  // riceve l'event bus del form pricipale
  this._formEventBus = options.formEventBus || null;
  // sono le relazioni effettive presenti
  let relations = [];
  const formLayer = this._context.layer;
  const layerId = formLayer.getId();
  const formFeature = this._inputs.features[this._inputs.features.length - 1];
  if (formLayer.isFather()) {
    // recupero l'array delle relazioni
    relations = formLayer.getRelations().getArray();
    // vado a filtrare le relazioni per quelle che sono effettivamente in editing
    relations = EditingService.getRelationsInEditing({
      layerId,
      relations,
      feature: formFeature,
      isNew: formFeature.isNew()
    });
    // le relazioni in questione sono oggetti Realtion che contengono le informazioni nello stato delle composizione della relazione
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
