var RelationService = require('../relationservice');
var GUI = g3wsdk.gui.GUI;
var maxSubsetLength = 3;
var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['relation', 'getFormEventBus'],
  data: function() {
    return {
      relations: this.relation.relations,
      validate: {
        valid: true
      },
      tools:  [],// tools che uguali per tutte le relazioni
      showtoolsatindex: null,
      resourcesurl: GUI.getResourcesUrl()
    }
  },
  methods: {
    relationAttributesSubset: function(relation) {
      var attributes = [];
      _.forEach(this.service.getLayer().getFieldsWithValues(relation), function (field) {
          if (_.isArray(field.value)) return;
          attributes.push({label: field.label, value: field.value})
      });
      var end = Math.min(maxSubsetLength, attributes.length);
      return attributes.slice(0, end);
    },
    unlinkRelation: function(index) {
      var self = this;
      var relation = this.relations[index];
      this.service.unlinkRelation(relation)
        .then(function(relation) {
          self.relations.splice(index, 1)[0];
        })
    },
    addRelationAndLink: function() {
      var self = this;
      this.service.addRelation()
        .then(function(relation) {
          self.relations.push(relation);
        })
    },
    startTool: function(relationtool, index) {
      var self = this;
      var relation = this.relations[index];
      this.service.startTool(relationtool, relation)
        .then(function(relation) {
          if (relationtool.getId() == 'deletefeature')
            self.relations.splice(index, 1)
        })
    },
    linkRelation: function() {
      var self = this;
      this.service.linkRelation()
        .then(function(relation) {
          self.relations.push(relation);
        })
    },
    updateExternalKeyValueRelations: function(input) {
      this.service.updateExternalKeyValueRelations(input);
    },
    
    showRelationTools: function(index) {
      this.showtoolsatindex = this.showtoolsatindex == index ? null : index;
    },
    getRelationTools: function() {
      return this.service.getRelationTools();
    }
  },
  watch: {
    // vado a verificare lo state
    'state.relations': function() {
      Vue.nextTick(function() {
        // con l'aggiunta di relazioni vado a fare il nano scroll
        $(".g3w-form-component_relations .nano").nanoScroller();
      })
    }
  },
  created: function() {
    this.service = new RelationService({
      relation: this.relation
    });
    this.service.init();
  },
  mounted: function() {
    var formEventBus = this.getFormEventBus();
    formEventBus.$on('changeinput', this.updateExternalKeyValueRelations);
    formEventBus.$emit('addtovalidate', this.validate)
  }
 });

module.exports = RelationComponent;