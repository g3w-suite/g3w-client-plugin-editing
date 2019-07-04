const t = g3wsdk.core.i18n.tPlugin;
const RelationService = require('../../../../services/relationservice');
const MediaMixin = g3wsdk.gui.vue.Mixins.mediaMixin;
const maxSubsetLength = 5;
let relationsTable;

 RelationComponent = Vue.extend({
  mixins: [MediaMixin],
  name: 'g3w-relation',
  template: require('./relation.html'),
  data: function() {
    return {
      showallfieldsindex: null,
      tooltips: {
        add_relation: t("editing.form.relations.tooltips.add_relation"),
        link_relation: t("editing.form.relations.tooltips.link_relation"),
        open_relation_tool: t("editing.form.relations.tooltips.open_relation_tools"),
        unlink_relation: t("editing.form.relations.tooltips.unlink_relation")
      },
      value: null,
      placeholdersearch: `${t('editing.search')} ...`
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
        .then(() => {})
        .catch((error) => {})
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
      value = value && value.toString().indexOf('_new_') !== -1 ? '' : value;
      this.value = value;
      return value;
    },
    getFileName(value) {
      return this.getValue(value).split('/').pop();
    },
    _setDataTableSearch() {
      $('#filterRelation').on('keyup', function() {
        relationsTable.search($(this).val()).draw() ;
      });
    },
    _createDataTable() {
      relationsTable = $('.g3wform-relation-table').DataTable({
        "scrollX": true,
        "order": [ 0, 'asc' ],
        "destroy": true,
        columnDefs: [
          { orderable: false, targets: [-1, -2, -3] }]
      });
      $(".dataTables_filter, .dataTables_length").hide();
      this._setDataTableSearch();
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
  created() {
    //vado a settare il servizio
    this._service = new RelationService({
      relation: this.relation,
      relations: this.relations
    });
    this._service.showRelationStyle();
    this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);
  },
  activated() {
    if (!relationsTable && this.relationsLength) {
      this.$nextTick(() => {
        this._createDataTable();
      })
    }
  },
  deactivated() {
    if (relationsTable) {
      relationsTable = relationsTable.destroy();
      relationsTable = null;
      $('#filterRelation').off();
    }
  },
  mounted() {
    this.$nextTick(() => {
      $('.g3w-icon[data-toggle="dropdown"]').tooltip();
      $('[data-toggle="tooltip"]').tooltip();
    })
  },
  destroyed: function() {
    this._service.hideRelationStyle();
  }
 });


module.exports = RelationComponent;
