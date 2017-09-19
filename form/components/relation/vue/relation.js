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
      this.service.addRelation(this.state);
      var relation = {
        name: Date.now()
      };
      this.relations.push(relation);
    }
  },
  watch: {
    // vado a verificare lo state
    'relations': function() {
      Vue.nextTick(function() {
        $(".g3w-form-component_relations .nano").nanoScroller();
      })
    }
  },
  mounted: function() {
    this.service = new RelationService();
  }
 });

module.exports = RelationComponent;