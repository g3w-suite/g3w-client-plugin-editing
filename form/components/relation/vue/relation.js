const t = g3wsdk.core.i18n.t;
const RelationService = require('../../../../services/relationservice');
const MediaMixin = g3wsdk.gui.vue.mixins.mediaMixin;
const maxSubsetLength = 5;

 RelationComponent = Vue.extend({
  mixins: [MediaMixin],
  template: require('./relation.html'),
  props: ['relation', 'relations', 'resourcesurl', 'formeventbus'],
  data: function() {
    return {
      showallfieldsindex: null,
      tooltips: {
        add_relation: t("form.relations.tooltips.add_relation"),
        link_relation: t("form.relations.tooltips.link_relation"),
        open_relation_tool: t("form.relations.tooltips.open_relation_tools"),
        unlink_relation: t("form.relations.tooltips.unlink_relation")
      },
      value: null
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
      let attributes = [];
      const fields = this.relationsFields(relation);
      fields.forEach((field) => {
        if (_.isArray(field.value)) return;
        attributes.push({label: field.label, value: field.value})
      });
      const end = Math.min(maxSubsetLength, attributes.length);
      return attributes.slice(0, end);
    },
    relationsAttributesSubsetLength: function(relation) {
      return this.relationAttributesSubset(relation).length;
    },
    relationsFields: function(relation) {
      let attributes = this._service.relationFields(relation);
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
    },
    getValue(value) {
      if (value && typeof  value === 'object' && value.constructor === Object) {
        value = value.value;
      }
      this.value = value;
      return value;
    },
    isMedia(value) {
      if (value && typeof  value === 'object' && value.constructor === Object) {
        return !!value.mime_type;
      }
      return false;
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
    this.formeventbus.$emit('addtovalidate', this.validate);
    Vue.nextTick(function() {
      $('.g3w-form-component_relations .g3w-icon[data-toggle="dropdown"]').tooltip();
    })
  },
  destroyed: function() {
    this._service.hideRelationStyle();
  }
 });

module.exports = RelationComponent;
