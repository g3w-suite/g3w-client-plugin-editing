var RelationService = require('../relationservice');
var maxSubsetLength = 3;
var RelationComponent = Vue.extend({
  template: require('./relation.html'),
  props: ['relation', 'relations', 'resourcesurl', 'formeventbus'],
  data: function() {
    return {
      showallfieldsindex: null
    }
  },
  methods: {
    unlinkRelation: function(index) {
      this._service.unlinkRelation(index)
    },
    addRelationAndLink: function() {
      this._service.addRelation();
    },
    startTool: function(relationtool, index) {
      this._service.startTool(relationtool, index)
    },
    linkRelation: function() {
      this._service.linkRelation();
    },
    updateExternalKeyValueRelations: function(input) {
      this._service.updateExternalKeyValueRelations(input);
    },
    isRequired: function() {
      return this._service.isRequired();
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
    relationsAttributesSubsetLength: function(relation) {
      return this.relationAttributesSubset(relation).length;
    },
    relationsFields: function(relation) {
      var attributes = [];
      _.forEach(relation.fields, function (field) {
        attributes.push({label: field.label, value: field.value})
      });
      return attributes;
    },
    showAllRelationFields: function(index) {
      this.showallfieldsindex = this.showallfieldsindex == index ? null : index;
    },
    showAllFieds: function(index) {
      return this.showallfieldsindex == index;
    },
    getRelationTools: function() {
      return this._service.getRelationTools();
    }
  },
  computed: {
    relationsLength: function() {
      return this.relations.length;
    },
    fieldrequired: function() {
      return this._service.isRequired();
    },
    enableAddLinkButtons: function() {
      return !this.relations.length || (this.relations.length && this.relation.type != 'ONE');
    }
  },
  watch: {
    // vado a verificare lo state
    'relations': function() {
      this._service.showRelationStyle();
      Vue.nextTick(function() {
        // con l'aggiunta di relazioni vado a fare il nano scroll
        $(".g3w-form-component_relations .nano").nanoScroller();
      })
    }
  },
  created: function() {
    //vado a settare il servizio
    this._service = new RelationService({
      relation: this.relation,
      relations: this.relations
    })
  },
  mounted: function() {
    this._service.showRelationStyle();
    this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);
    this.formeventbus.$emit('addtovalidate', this.validate)
  },
  destroyed: function() {
    this._service.hideRelationStyle();
  }
 });

module.exports = RelationComponent;