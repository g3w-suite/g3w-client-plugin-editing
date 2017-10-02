var RelationService = require('../relationservice');
var maxSubsetLength = 3;
var service;
var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['relation', 'resourcesurl', 'formeventbus'],
  data: function() {
    return {
      relations: this.relation.relations,
      validate: {
        valid: true
      },
      showtoolsatindex: null
    }
  },
  methods: {
    relationAttributesSubset: function(relation) {
      var attributes = [];
      var layer = service.getLayer();
      _.forEach(layer.getFieldsWithValues(relation), function (field) {
          if (_.isArray(field.value)) return;
          attributes.push({label: field.label, value: field.value})
      });
      var end = Math.min(maxSubsetLength, attributes.length);
      return attributes.slice(0, end);
    },
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
    showRelationTools: function(index) {
      this.showtoolsatindex = this.showtoolsatindex == index ? null : index;
    },
    getRelationTools: function() {
      return service.getRelationTools();
    }
  },
  computed: {
    fieldrequired: function() {
      return service.isRequired();
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
    //vado a settare il servizio
    service = new RelationService({
      relation: this.relation
    });
  },
  mounted: function() {
    this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);
    this.formeventbus.$emit('addtovalidate', this.validate)
  }
 });

module.exports = RelationComponent;