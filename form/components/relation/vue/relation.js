const t = g3wsdk.core.i18n.tPlugin;
const toRawType = g3wsdk.core.utils.toRawType;
const RelationService = require('../../../../services/relationservice');
const {fieldsMixin, resizeMixin, mediaMixin} = g3wsdk.gui.vue.Mixins;
const compiledTemplate = Vue.compile( require('./relation.html'));
let relationsTable;

const RelationComponent = Vue.extend({
  mixins: [mediaMixin, fieldsMixin, resizeMixin],
  name: 'g3w-relation',
  ...compiledTemplate,
  data() {
    return {
      showallfieldsindex: null,
      tooltips: {
        add_relation: "editing.form.relations.tooltips.add_relation",
        link_relation: "editing.form.relations.tooltips.link_relation",
        open_relation_tool: "editing.form.relations.tooltips.open_relation_tools",
        unlink_relation: "editing.form.relations.tooltips.unlink_relation"
      },
      value: null,
      placeholdersearch: `${t('editing.search')} ...`
    }
  },
  methods: {
    resize(){
      relationsTable && relationsTable.columns.adjust();
    },
    unlinkRelation: function(index) {
      this._service.unlinkRelation(index)
    },
    addRelationAndLink: function() {
      this._service.addRelation();
    },
    startTool: function(relationtool, index) {
      this._service.startTool(relationtool, index)
        .then(() => {})
        .catch(error => console.log(error))
    },
    linkRelation() {
      this._service.linkRelation();
    },
    updateExternalKeyValueRelations(input) {
      this._service.updateExternalKeyValueRelations(input);
    },
    isRequired() {
      return this._service.isRequired();
    },
    relationAttributesSubset(relation) {
      let attributes = [];
      const fields = this.relationsFields(relation);
      fields.forEach(field => {
        if (Array.isArray(field.value)) return;
        const {label, value} = field;
        attributes.push({
          label,
          value
        })
      });
      return attributes;
    },
    relationsAttributesSubsetLength(relation) {
      return this.relationAttributesSubset(relation).length;
    },
    relationsFields(relation) {
      return this._service.relationFields(relation);
    },
    showAllRelationFields(index) {
      this.showallfieldsindex = this.showallfieldsindex == index ? null : index;
    },
    showAllFieds(index) {
      return this.showallfieldsindex == index;
    },
    getRelationTools() {
      return this._service.getRelationTools();
    },
    isLink(value){
      value = this.getValue(value);
      return ['photo', 'link'].indexOf(this.getFieldType(value)) !== -1;
    },
    getValue(value) {
      if (value && toRawType(value) === 'Object') value = value.value;
      else if (typeof value == 'string' && value.indexOf('_new_') === 0) value = null;
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
        "order": [ 2, 'asc' ],
        "destroy": true,
        "scrollResize": true,
        "scrollCollapse": true,
        "pageLength": 10,
        columnDefs: [
          { orderable: false, targets: [0, 1] }]
      });
      $(".dataTables_filter, .dataTables_length").hide();
      this._setDataTableSearch();
    },
    destroyTable(){
      if (relationsTable) {
        relationsTable = relationsTable.destroy();
        relationsTable = null;
        $('#filterRelation').off();
      }
    }
  },
  computed: {
    relationsLength() {
      return this.relations.length;
    },
    fieldrequired() {
      return this._service.isRequired();
    },
    enableAddLinkButtons() {
      return !this.relations.length || (this.relations.length && this.relation.type !== 'ONE');
    }
  },
  watch:{
    relations(updatedrelations){
      updatedrelations.length === 0 && this.destroyTable();
    }
  },
  beforeCreate(){
    this.delayType = 'debounce';
  },
  created() {
    this._service = new RelationService(this.layerId, {
      relation: this.relation, // main relation between layerId (current in editing)
      relations: this.relations // relation related to current feature of current layer in editing
    });
    this.editingtype = this._service.getEditingType();
    this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);
  },
  async activated() {
    if (!relationsTable && this.relationsLength) this._createDataTable();
  },
  deactivated() {
    this.destroyTable();
  },
  async mounted() {
    await this.$nextTick();
    $('.g3w-icon[data-toggle="dropdown"]').tooltip();
    $('[data-toggle="tooltip"]').tooltip();
  },
  destroyed() {}
 });


module.exports = RelationComponent;
