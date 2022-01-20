const inherit = g3wsdk.core.utils.inherit;
const base =  g3wsdk.core.utils.base;
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
  data: function() {
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
      const OtherElementHeight = $('.navbar-header').height() + $('.editing_table_title').height() +
        $('.editing_table_header').height() +  $('.dataTables_length').height() + $('.dataTables_paginate paging_simple_numbers').height() +
        $('.dataTables_filter').height() + $('.dataTables_scrollHeadInner').height() + $('.table_editing_footer_buttons').height();
      $('#editing_table  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - OtherElementHeight - 50);
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
    save() {
      this.state.isrelation ? this.$options.service.linkFeatures(this._linkFeatures) :this.$options.service.save();
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
    copyFeature(uid){
      this.$options.service.copyFeature(uid).then(async feature =>{
        this.show = false;
        this.dataTable.destroy();
        await this.$nextTick();
        this.show = true;
        await this.$nextTick();
        this.setDataTable();
      })
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
    getValue(value) {
       if (value && typeof  value === 'object' && value.constructor === Object)
         value = value.value;
       else if (typeof value == 'string' && value.indexOf('_new_') === 0)
         value = null;
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


