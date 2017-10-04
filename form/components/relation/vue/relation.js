var RelationService = require('../relationservice');
var maxSubsetLength = 3;
var service;
var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['relation', 'relations', 'resourcesurl', 'formeventbus'],
  methods: {
    unlinkRelation: function(index) {
      service.unlinkRelation(index)
    },
    addRelationAndLink: function() {
      service.addRelation();
    },
    startTool: function(relationtool, index) {
      service.startTool(relationtool, index)
    },
    linkRelation: function() {
      service.linkRelation();
    },
    updateExternalKeyValueRelations: function(input) {
      service.updateExternalKeyValueRelations(input);
    },
    isRequired: function() {
      return service.isRequired();
    },
    relationAttributesSubset: function(relation) {
      var attributes = [];
      _.forEach(relation.fields, function (field) {
        if (_.isArray(field.value)) return;
        attributes.push({label: field.label, value: field.value})
      });
      var end = Math.min(maxSubsetLength, attributes.length);
      return attributes.slice(0, end);
    },
    getRelationTools: function() {
      return service.getRelationTools();
    }
  },
  computed: {
    relationsLength: function() {
      return this.relations.length;
    },
    fieldrequired: function() {
      return service.isRequired();
    }
  },
  watch: {
    // vado a verificare lo state
    'relations': function() {
      service.showRelationStyle();
      Vue.nextTick(function() {
        // con l'aggiunta di relazioni vado a fare il nano scroll
        $(".g3w-form-component_relations .nano").nanoScroller();
      })
    }
  },
  created: function() {
    //vado a settare il servizio
    service = new RelationService({
      relation: this.relation,
      relations: this.relations
    })
  },
  mounted: function() {
    service.showRelationStyle();
    this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);
    this.formeventbus.$emit('addtovalidate', this.validate)
  },
  destroyed: function() {
    service.hideRelationStyle();
  }
 });

module.exports = RelationComponent;