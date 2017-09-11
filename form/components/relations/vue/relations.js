var RelationComponent = require('../../relation/vue/relation');
var RelationsComponent = Vue.extend({
  template: require('./relations.html'),
  components: {
    relation: RelationComponent
  },
  data: function() {
    return {
      state: {
        min: 1,
        max: 1,
        relations: [],
        valid: false
      }
    }
  },
  methods: {
    unlinkRelation: function(index) {
      this.state.relations.splice(index,1)
    },
    linkRelation: function(relation) {
      var relation = {
        name: Date.now()
      };
      console.log('qui');
      this.state.relations.push(relation);
    },
    isValidRelationsNumber: function() {
       this.state.valid = (this.state.relations.length >= this.state.min && this.state.relations.length <= this.state.max);
    }
  },
  watch: {
    // vado a verificare lo state
    'state.relations': function() {
      this.isValidRelationsNumber();
      this.$emit('validateform');
      Vue.nextTick(function() {
        $(".nano").nanoScroller();
      })
    }
  },
  mounted: function() {
    //vado a verificare il numero di relationi
    this.isValidRelationsNumber();
    this.$emit('addtovalidate', this.state)
  }
});

module.exports = RelationsComponent;