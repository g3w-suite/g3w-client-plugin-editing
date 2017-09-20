var RelationComponent = require('../../relation/vue/relation');
var RelationsComponentObj = {
  template: require('./relations.html'),
  components: {
    'relation': RelationComponent
  },
  data: function() {
    return {
      state: null
    }
  },
  methods: {
    isValidRelationsNumber: function(idx) {
      this.state.validate.valid = this.state.relations[idx].length >= this.state.relations[idx].TYPE;
    }
  },
  mounted: function() {
    //vado a verificare il numero di relationi
    // emetto il segnale che il form riconoscerà come agiunta a validazione
    this.$emit('addtovalidate', this.state.validate)
  }
};

module.exports = RelationsComponentObj;