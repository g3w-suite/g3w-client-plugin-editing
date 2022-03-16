const {GUI} = g3wsdk.gui;
const RelationComponent = require('./components/relation/vue/relation');
const EditingFormService = function(options={}) {
  const EditingService = require('../services/editingservice');
  this.state = {
    relations: []
  };
  const {layer, features} = options.inputs || {};
  // get back to Father function
  const {backToFather=()=>{}} = options;
  this._formEventBus = options.formEventBus || null;
  const layerId = layer.getId();
  // get feature
  const feature = features[features.length - 1];
  // get only relation with type not ONE and layer is the father
  const projectRelations = layer.getRelations().getArray().filter(relation => relation.getType() !== 'ONE' && relation.getFather() === layerId);
  const relations = EditingService.getRelationsInEditing({layerId, relations:projectRelations , feature});
  this.hasRelations = () => !!relations.length;
  this.buildRelationComponents = function() {
    const self = this;
    const relationComponents = [];
    relations.forEach(({relation, relations}, index) => {
      const {name, id} = relation;
      const relationComponent = Vue.extend({
        mixins: [RelationComponent],
        name: `relation_${Date.now()}`,
        methods: {
          getService() {
            return self._relationsService;
          },
          backToFather
        },
        data() {
          return {
            layerId,
            relation, // relation info
            relations, // are the features relations
            resourcesurl: GUI.getResourcesUrl(),
            formeventbus: self._formEventBus
          }
        },
        async created(){
          await EditingService.getLayersDependencyFeatures(layerId, {
            feature,
            filterType: 'fid'
          });
          this.relations = EditingService.getRelationsInEditing({
            layerId,
            relations:[projectRelations[index]],
            feature
          })[0].relations;
          this._service.relation = relation;
          this._service.relations = this.relations;
        },
        async mounted(){
          await this.$nextTick();
          this.resize();

        }
      });
      relationComponents.push({
        title: "plugins.editing.edit_relation",
        name,
        id,
        header: false, // not show to header form
        component: relationComponent
      })
    });
    return relationComponents;
  };
};

module.exports =  EditingFormService;
