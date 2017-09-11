var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['index', 'state'],
  data: function() {
    return {}
  },
  methods: {
    unlinkRelation: function() {
      this.$emit('unlinkrelation', this.index)
    }
  }
});

module.exports = RelationComponent;