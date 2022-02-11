const {base, inherit} = g3wsdk.core.utils;
const Component = g3wsdk.gui.vue.Component;
const {resizeMixin} = g3wsdk.gui.vue.Mixins;
const Media_Field = g3wsdk.gui.vue.Fields.media_field;
const TableService = require('../tableservice');
const compiledTemplate = Vue.compile(require('./table.html'));

const InternalComponent = Vue.extend({
  ...compiledTemplate,
  mixins: [resizeMixin],
  components: {
    'g3w-media': Media_Field
  },
  data() {
    this.dataTable = null;
    return {
      state: null,
      show: true
    }
  },
  methods: {
    showTool(type){
      return this.state.capabilities.find(capability => capability === type) !== undefined;
    },
    async resize(){
      await this.$nextTick();
      const tableHeight = $(".content").height();
      const tableHeaderHeight = $('#editing_table  div.dataTables_scrollHeadInner').height();
      const OtherElementHeight =  $('.editing_table_title').height() +
        $('.editing_table_header').height() + $('.dataTables_length').height() + $('.dataTables_paginate paging_simple_numbers').height() +
        $('.dataTables_filter').height() + $('.table_editing_footer_buttons').height();
       $('#editing_table  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - OtherElementHeight - 30);
    },
    showValue(key) {
      return !!this.state.headers.find(header => header.name === key);
    },
    isMediaField(name) {
      return this.$options.service.isMediaField(name)
    },
    stop() {
      this.$options.service.cancel();
    },
    addReport() {
      this.$options.service.save();
    },
    cancel() {
      this.$options.service.cancel();
    },
    async deleteFeature(uid) {
      const element = $(`#editing_table table tr#${uid}`);
      this.$options.service.deleteFeature(uid).then(async ()=>{
        this.dataTable.row(element).remove().draw();
        await this.$nextTick();
      }).catch(()=>{});
    },
    editFeature(uid) {
      this.$options.service.editFeature(uid);
    },
    linkFeature(index, evt) {
     if (evt.target.checked) this._linkFeatures.push(index);
      else this._linkFeatures = this._linkFeatures.filter(addindex => addindex !== index);
    },
    _setLayout() {
      return this.$options.service._setLayout();
    },
    getColor(fieldName){
      return this.$options.service.getColorFromLayerInput(fieldName);
    },
    getValue(key, value) {
       if (key){
         const labelValue = this.$options.service.getLabelValueFromLayerInput(key, value);
         if (labelValue !== undefined) return labelValue;
       }
       if (value && typeof  value === 'object' && value.constructor === Object) value = value.value;
       else if (typeof value == 'string' && value.indexOf('_new_') === 0) value = null;
       return value;
    },
    setDataTable(){
      this.dataTable = $('#editing_table table').DataTable({
        "pageLength": 10,
        "scrollX": true,
        "scrollCollapse": true,
        "scrollResize": true,
        "order": [1, 'asc' ],
        columnDefs: [
          { orderable: false, targets: 0 }
        ]
      });
      this.resize();
    }
  },
  watch: {
    'state.features'(features){}
  },
  beforeCreate() {
    this.delayType = 'debounce';
  },
  async mounted() {
    if (this.state.isrelation) this._linkFeatures = [];
    await this.$nextTick();
    this.setDataTable();
    $('#table-editing-tools i').tooltip();
    this.resize();
  },
  beforeDestroy() {
    if (this._linkFeatures) this._linkFeatures = null;
    this.dataTable.destroy();
  }
});

const TableComponent = function(options={}) {
  base(this);
  const service = options.service || new TableService({
   ...options
  });
  this.setService(service);
  const internalComponent = new InternalComponent({
    service
  });
  this.setInternalComponent(internalComponent);
  internalComponent.state = service.state;
  this.unmount = function() {
    service.cancel();
    return base(this, 'unmount');
  };
};

inherit(TableComponent, Component);


module.exports = TableComponent;


