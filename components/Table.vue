<!-- ORIGINAL SOURCE: -->
<!-- table/table.html@v3.4 -->
<!-- table.js@v3.4 -->

<template>
  <div
    id="editing_table"
    class="g3w-editing-table"
  >
    <div
      ref="editing_table_header"
      class="editing_table_header"
    >
      <div style="display: flex; justify-content: space-between; align-items: baseline">
        <h3
          class="editing_table_title">
            {{ state.title }}
        </h3>

        <h-resize @h_size_change="changeSize"/>

      </div>

      <div
        v-if="state.isrelation"
        class="editing_table_relation_messagge"
        style="font-weight: bold"
        v-t-plugin="'editing.relation.table.info'">
      </div>
    </div>

    <table
        v-if="show"
        class="display"
        style="width:100%"
    >
      <thead>
        <tr>
          <th v-if="!state.isrelation" style="max-width: 60px"></th>
          <th v-if="state.isrelation"></th>
          <th v-for="header in state.headers">{{ header.label }}</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(feature, index) in state.features"
          :key="feature.__gis3w_feature_uid"
          :id="feature.__gis3w_feature_uid"
        >
          <td v-if="!state.isrelation">
            <div
              id="table-editing-tools"
              style="display:flex; justify-content: space-between;"
            >
              <i
                v-if="showTool('change_attr_feature')"
                :class="g3wtemplate.font['pencil']"
                class="g3w-icon skin-tooltip-right"
                data-placement="right"  style="color:#30cce7;"
                v-t-title:plugin="'editing.table.edit'"
                aria-hidden="true"
                @click.stop="editFeature(feature.__gis3w_feature_uid)">
              </i>

              <i
                v-if="showTool('add_feature')"
                :class="g3wtemplate.font['copy-paste']"
                class="g3w-icon skin-tooltip-right"
                data-placement="right"
                style="color:#d98b14; padding: 5px 7px 5px 7px;"
                v-t-title:plugin="'editing.table.copy'"
                aria-hidden="true"
                @click.stop="copyFeature(feature.__gis3w_feature_uid)">
              </i>

              <i
                v-if="showTool('delete_feature')"
                :class="g3wtemplate.font['trash-o']"
                class="g3w-icon skin-tooltip-right"
                data-placement="right"
                style="color:red;"
                v-t-title:plugin="'editing.table.delete'"
                aria-hidden="true"
                @click.stop="deleteFeature(feature.__gis3w_feature_uid)">
              </i>

            </div>
          </td>
          <td v-if="state.isrelation">
            <input
              :id="`relation__${index}`"
              @change="linkFeature(index, $event)"
              class="magic-checkbox"
              type="checkbox">
            <label :for="`relation__${index}`"></label>
          </td>
          <td
            v-if="showValue(key)"
            v-for="(value, key) in feature" :key="key">
              <g3w-media
                v-if="getValue(value) && isMediaField(key)"
                :state="value" />
              <p v-else>{{ getValue(value) }}</p>
          </td>
      </tr>

      </tbody>

    </table>

    <div
      id="buttons"
      ref="table_editing_footer_buttons"
      class="table_editing_footer_buttons"
      style="position: absolute; bottom: 10px; width: 100%; display:flex; justify-content: center;"
    >
      <button
        v-t-plugin="state.isrelation ? 'editing.form.buttons.save_and_back' : 'editing.form.buttons.save'"
        class="btn btn-success" style="margin-right: 10px"
        @click.stop="save">
      </button>

      <button
        v-t-plugin="'editing.form.buttons.cancel'"
        class="btn btn-danger"
        @click.stop="cancel">
      </button>

    </div>
  </div>
</template>

<script>
  const {base, inherit} = g3wsdk.core.utils;
  const {resizeMixin} = g3wsdk.gui.vue.Mixins;
  const Media_Field = g3wsdk.gui.vue.Fields.media_field;

  export default {
    name: 'Table',
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
      async changeSize(){
        await this.$nextTick();
        setTimeout(() => this.resize())
      },
      showTool(type){
        return this.state.capabilities.find(capability => capability === type) !== undefined;
      },
      async resize(){
        if (this.$el.style.display !== 'none'){
          await this.$nextTick();
          const tableHeight = $(".content").height();
          const closePanelBlockHeight = $('.close-panel-block').outerHeight();
          const tableHeaderHeight = $('#editing_table  div.dataTables_scrollHeadInner').outerHeight();
          const OtherElementHeight =  $('.editing_table_title').outerHeight() +
            $('.editing_table_header').outerHeight() +
            $('.editing_table_relation_messagge').outerHeight() +
            $('.dataTables_length').outerHeight() +
            $('.dataTables_paginate.paging_simple_numbers').outerHeight() +
            $('.dataTables_info').outerHeight() +
            $('.dataTables_filter').outerHeight() +
            $('.table_editing_footer_buttons').outerHeight() +
            $('#editing_table .dataTables_paginate.paging_simple_numbers').outerHeight();
          $('#editing_table  div.dataTables_scrollBody').height(tableHeight - closePanelBlockHeight - tableHeaderHeight - OtherElementHeight);
          this.dataTable && this.dataTable.columns.adjust();
        }
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
        this.state.isrelation ?
          this.$options.service.linkFeatures(this._linkFeatures) :
          this.$options.service.save();
      },
      cancel() {
        this.$options.service.cancel();
      },
      async deleteFeature(uid) {
        const element = $(`#editing_table table tr#${uid}`);
        this.$options.service.deleteFeature(uid)
          .then(async () => {
            this.dataTable
              .row(element)
              .remove()
              .draw();
            await this.$nextTick();
          })
          .catch(()=>{});
      },
      copyFeature(uid){
        this.$options.service.copyFeature(uid)
          .then(async(feature) => {
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
      await this.$nextTick();
      if (this.state.isrelation) this._linkFeatures = [];
      this.setDataTable();
      $('#table-editing-tools i').tooltip();
      this.$options.service.emit('ready');
      this.resize();
    },
    beforeDestroy() {
      if (this._linkFeatures) this._linkFeatures = null;
      this.dataTable.destroy();
    }
  };
</script>

<style scoped>
  #table-editing-tools i {
    margin: 5px;
  }
</style>
