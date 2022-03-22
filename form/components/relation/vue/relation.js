const t = g3wsdk.core.i18n.tPlugin;
const {toRawType} = g3wsdk.core.utils;
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
        add_relation: "plugins.editing.form.relations.tooltips.add_relation",
        link_relation: "plugins.editing.form.relations.tooltips.link_relation",
        open_relation_tool: "plugins.editing.form.relations.tooltips.open_relation_tools",
        unlink_relation: "plugins.editing.form.relations.tooltips.unlink_relation"
      },
      value: null,
      placeholdersearch: `${t('editing.search')} ...`
    }
  },
  methods: {
    resize(){
      if (this.$el.style.display !== 'none'){
        const formBodyHeight = $(".g3wform_body").height();
        const formFooterHeight = $('.g3wform_footer').height();
        const relationHeaderTitle = $(this.$refs.relation_header_title).height();
        const relationHeaderTools = $(this.$refs.relation_header_tools).height();
        const dataTables_scrollHead_Height = $(this.$el).find('.dataTables_scrollHead').height();
        $(this.$refs.relation_body).find('div.dataTables_scrollBody').height(formBodyHeight - formFooterHeight - relationHeaderTitle - relationHeaderTools - dataTables_scrollHead_Height - 50);
        relationsTable && relationsTable.columns.adjust();
      }
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
    isLink(field){
      return ['photo', 'link'].indexOf(this.getFieldType(field)) !== -1;
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
    },
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
    console.log(this.cardinality)
    this.loadEventuallyRelationValuesForInputs = false;
    this._service = new RelationService(this.layerId, {
      relation: this.relation, // main relation between layerId (current in editing)
      relations: this.relations // relation related to current feature of current layer in editing
    });
    this.capabilities = this._service.getEditingCapabilities();
    this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);
  },
  async activated() {
    if (!this.loadEventuallyRelationValuesForInputs) {
      const EditingService = require('../../../../services/editingservice');
      EditingService.runEventHandler({
        type: 'show-relation-editing',
        id: EditingService._getRelationId({
          layerId: this.layerId,
          relation: this.relation
        }),
        component: this
      });
      this.loadEventuallyRelationValuesForInputs = true;
    }
    !relationsTable && this.relationsLength && this._createDataTable();
  },
  deactivated() {
    this.destroyTable();
  },
  beforeDestroy() {
    this.loadEventuallyRelationValuesForInputs = true;
  }
 });


module.exports = RelationComponent;
