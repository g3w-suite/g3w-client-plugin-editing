var RelationService = require('../relationservice');
var InputsEventBus = g3wsdk.gui.vue.inputs.InputsEventBus;
var maxSubsetLength = 3;
var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['index', 'state'],
  data: function() {
    return {
      relations: []
    }
  },
  methods: {
    relationAttributesSubset: function(relation) {
      var attributes = [];
      _.forEach(relation.getProperties(), function (value, attribute) {
        if (attribute != 'geometry') {
          if (_.isArray(value)) return;
          attributes.push({label: attribute, value: value})
        }
      });
      var end = Math.min(maxSubsetLength, attributes.length);
      return attributes.slice(0, end);
    },
    unlinkRelation: function(index) {
      var relation = this.relations.splice(index, 1)[0];
      relation.set(this.state.childField, null);
    },
    addNewRelationAndLink: function() {
      alert('add new relation');
    },
    linkRelation: function() {
      var self = this;
      this.service.addRelation(this.state)
        .then(function(feature) {
          self.relations.push(feature)
        })
    },
    updateExternalKeyValueRelations: function(input) {
      var self = this;
      if (input.name == this.state.fatherField) {
        _.forEach(this.relations, function(relation) {
          relation.set(self.state.childField, input.value);
        })
      }
    }
  },
  watch: {
    // vado a verificare lo state
    'relations': function() {
      Vue.nextTick(function() {
        // con l'aggiunta di relazioni vado a fare il nano scroll
        $(".g3w-form-component_relations .nano").nanoScroller();
      })
    }
  },
  mounted: function() {
    this.service = new RelationService();
    InputsEventBus.$on('changeinput', this.updateExternalKeyValueRelations);
  }
 });

module.exports = RelationComponent;