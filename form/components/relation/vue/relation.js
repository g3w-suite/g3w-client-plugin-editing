var RelationService = require('../relationservice');
var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['index', 'state'],
  data: function() {
    return {
      relations: []
    }
  },
  methods: {
    unlinkRelation: function(index) {
      this.relations.splice(index, 1)
    },
    linkRelation: function() {
      var self = this;
      this.service.addRelation(this.state)
        .then(function(feature) {
          var attributes = feature.getProperties();
          self.relations.push(attributes)
        })
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
  }
 });

module.exports = RelationComponent;