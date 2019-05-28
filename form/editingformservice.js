const GUI = g3wsdk.gui.GUI;
const t = g3wsdk.core.i18n.tPlugin;
const RelationComponent = require('./components/relation/vue/relation');
const EdtingFormService = function() {
  const EditingService = require('../services/editingservice');
  this.state = {
    relations: []
  };
  // sono le relazioni effettive presenti
  let relations = [];
  this.init = async function(options={}) {
    this._context = options.context || {};
    // riceve gli inpust del form principale
    this._inputs = options.inputs || {};
    // riceve l'event bus del form pricipale
    this._formEventBus = options.formEventBus || null;
    const formLayer = this._context.layer;
    const feature = this._inputs.features[this._inputs.features.length - 1];
    if (formLayer.isFather()) {
      // recupero l'array delle relazioni
      relations = formLayer.getRelations().getArray();
      // vado a filtrare le relazioni per quelle che son o effettivamente in editing
      this._formEventBus.$emit('set-loading-form', true);
      relations = await EditingService.getRelationsInEditing({
        relations,
        feature
      });
      this._formEventBus.$emit('set-loading-form', false);
      return relations;
      // le relazioni in questione sono oggetti Realtion che contengono le informazioni nello stato delle composizione della relazione
    } else {
      return [];
    }
  };
  // riceve il context del form principale

  this.hasRelations = function() {
    return !!relations.length;
  };
  // funzione che mi serve per costruire il componente vue da innestare dentro il form
  // come componente relations
  this.buildRelationComponents = function() {
    const self = this;
    const relationComponents = [];
    for (let i = 0; i < relations.length; i++) {
      const relation = relations[i];
      const relationComponent = Vue.extend({
        mixins: [RelationComponent],
        name: relation.relation.name,
        methods: {
          getService: function() {
            return self._relationsService;
          }
        },
        data: function() {
          return {
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
    }
    return relationComponents;
  };
};

module.exports =  EdtingFormService;
