<!-- ORIGINAL SOURCE: -->
<!-- form/components/relation/vue/relation.html@v3.4 -->
<!-- form/components/relation/vue/relation.js@v3.4 -->

<template>
    <div
      v-if  = "active"
      style = "margin-bottom: 5px;"
    >

      <!-- RELATION TITLE -->
      <div
        ref   = "relation_header_title"
        class = "box-header with-border skin-color"
        style = "
          width: 100%;
          display: flex;
          font-weight: bold;
          font-size: 1.3em;
          align-items: center;
          /*margin-button: 3px;*/
          background-color: #fff;
        "
      >
        <span v-t-plugin="'editing.edit_relation'"></span>
        <span style="margin-left: 2px;">: {{relation.name.toUpperCase()}}</span>
      </div>

      <!-- RELATION TOOLS -->
      <div
        ref   = "relation_header_tools"
        class = "box-header with-border"
        style = "
          width: 100%;
          display: flex;
          /*margin-button:3px;*/
          background-color: #fff;
        "
      >
        <!-- SEARCH BOX -->
        <div id="search-box" style="margin-right: auto;">
          <input
            v-if         = "relationsLength"
            type         = "text"
            class        = "form-control"
            id           = "filterRelation"
            :placeholder = "placeholdersearch"
          >
        </div>

        <div style="display: flex; justify-content: flex-end">

          <!-- CHANGE ATTRIBUTE -->
          <span
            v-if                      = "undefined !== capabilities.relation.find(capability => 'change_attr_feature' === capability)"
            class                     = "g3w-icon add-link"
            align                     = "center"
            v-t-tooltip:bottom.create = "tooltips.link_relation"
            @click.stop               = "enableAddLinkButtons ? linkRelation() : null"
            :class                    = "[
              { 'disabled': !enableAddLinkButtons },
              g3wtemplate.font['link']
            ]"
          ></span>

          <!-- ADD FEATURE -->
          <span
            v-if                      = "undefined !== capabilities.relation.find(capability => 'add_feature' === capability)"
            v-t-tooltip:bottom.create = "tooltips.add_relation"
            @click                    = "enableAddLinkButtons ? addRelationAndLink() : null"
            class                     = "g3w-icon add-link pull-right"
            :class                    = "[
              { 'disabled' : !enableAddLinkButtons },
              g3wtemplate.font['plus']
            ]"
          ></span>

        </div>

      </div>

      <!-- VECTOR RELATION TOOLS -->
      <section
        v-if  = "showAddVectorRelationTools"
        ref   = "relation_vector_tools"
        style = "
          display: flex;
          flex-direction: column;
          border: 2px solid #eee;
          background-color: #fff;
          padding: 10px;
        "
      >

        <!-- ADD VECTOR RELATION -->
        <div>
          <div class="g3w-editing-new-relation-vector-type" v-t-plugin="'editing.relation.draw_new_feature'"></div>
          <button
            class       = "btn skin-button"
            style       = "width: 100%"
            @click.stop = "addVectorRelation"
          >
            <i :class="g3wtemplate.font['pencil']"></i>
          </button>
        </div>

        <divider/>

        <div style="align-self: center" v-t-plugin="'editing.relation.draw_or_copy'"></div>

        <divider/>

        <div
          id    = "g3w-select-editable-layers-content"
          style = "
            flex-grow: 1;
            display: flex;
            flex-direction: column
          "
        >

          <div class="g3w-editing-new-relation-vector-type" v-t-plugin="'editing.relation.copy_feature_from_other_layer'"></div>

          <select
            id        = "g3w-select-editable-layers-to-copy"
            v-select2 = "'copylayerid'"
          >
            <option
              v-for  = "copyFeatureLayer in copyFeatureLayers"
              :key   = "copyFeatureLayer.id"
              :value = "copyFeatureLayer.id"
            >{{copyFeatureLayer.name}}</option>
          </select>

          <!-- COPY FEATURE FROM OTHER LAYER -->
          <button
            class       = "btn skin-button"
            @click.stop = "copyFeatureFromOtherLayer"
          >
            <i :class="g3wtemplate.font['clipboard']"></i>
          </button>
        </div>

      </section>

      <!-- RELATION CONTENT -->
      <div
        ref   = "relation_body"
        class = "box-body"
        style = "padding:0;"
      >
        <table
          v-if  = "showTable"
          class = "table g3wform-relation-table table-striped"
          style = "width:100%"
        >
          <thead>
            <tr>
              <th v-t="'tools'"></th>
              <th></th>
              <th v-for="attribute in relationAttributesSubset(relations[0])">{{attribute.label}}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for = "(relation, index) in relations"
              class = "featurebox-header"
            >
              <td>
                <div style="display: flex">
                  <div
                    v-for              = "relationtool in getRelationTools()"
                    :key               = "relationtool.state.name"
                    class              = "skin-tooltip-right editbtn enabled"
                    @click.stop        = "startTool(relationtool, index)"
                    data-toggle        = "tooltip"
                    data-placement     = "right"
                    v-t-tooltip:plugin = "relationtool.state.name"
                  >
                    <img
                      height = "20px"
                      width  = "20px"
                      :src   = "`${resourcesurl}images/${relationtool.state.icon}`"
                    />
                  </div>
                </div>
              </td>
              <td class="action-cell">
                <div
                  v-if                     = "!fieldrequired && undefined !== capabilities.relation.find(capability => 'change_attr_feature' === capability)"
                  class                    = "g3w-mini-relation-icon g3w-icon"
                  :class                   = "g3wtemplate.font['unlink']"
                  @click.stop              = "unlinkRelation(index)"
                  v-t-tooltip:right.create = "tooltips.unlink_relation"
                  aria-hidden              = "true"
                ></div>
              </td>
              <td
                v-for  = "attribute in relationAttributesSubset(relation)"
                v-show = "!showAllFieds(index)"
              >
                <!-- MEDIA ATTRIBUTE-->
                <div
                  v-if = "isMedia(attribute.value) && getValue(attribute.value)"
                  class = "preview"
                >
                  <a :href="getValue(attribute.value)" target="_blank">
                    <div class="previewtype" :class="getMediaType(attribute.value.mime_type).type">
                      <i class="fa-2x" :class="g3wtemplate.font[getMediaType(attribute.value.mime_type).type]"></i>
                    </div>
                  </a>
                  <div class="filename">{{ getFileName(attribute.value) }}</div>
                </div>
                <!-- LINK ATTRIBUTE -->
                <a
                  v-else-if = "isLink(attribute)"
                  :href     = "getValue(attribute.value)"
                  target    = "_blank">{{ getValue(attribute.value) }}
                </a>
                <!-- TEXTUAL ATTRIBUTE -->
                <span v-else>{{ getValue(attribute.value) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
</template>

<script>
  const { tPlugin: t } = g3wsdk.core.i18n;
  const { toRawType }   = g3wsdk.core.utils;
  const { Layer }       = g3wsdk.core.layer;
  const {
    fieldsMixin,
    resizeMixin,
    mediaMixin,
  }                     = g3wsdk.gui.vue.Mixins;
  const RelationService = require('../services/relationservice');

  let relationsTable;

  export default {

    name: 'g3w-relation',

    mixins: [
      mediaMixin,
      fieldsMixin,
      resizeMixin
    ],

    data() {
      return {
        showAddVectorRelationTools: false,
        copylayerid:                null, //used for vector relation layer
        active:                     false,
        showallfieldsindex:         null,
        tooltips: {
          add_relation:             "plugins.editing.form.relations.tooltips.add_relation",
          link_relation:            "plugins.editing.form.relations.tooltips.link_relation",
          open_relation_tool:       "plugins.editing.form.relations.tooltips.open_relation_tools",
          unlink_relation:          "plugins.editing.form.relations.tooltips.unlink_relation",
        },
        value:                      null,
        placeholdersearch:          `${t('editing.search')} ...`,
        show:                       true
      };
    },

    methods: {

      resize() {
        // skip when ..
        if (!(this.active && 'none' !== this.$el.style.display)) {
          return;
        }

        const formBodyHeight               = $(".g3wform_body").height();
        const formFooterHeight             = $('.g3wform_footer').height();
        const relationHeaderTitle          = $(this.$refs.relation_header_title).outerHeight();
        const relationHeaderTools          = $(this.$refs.relation_header_tools).outerHeight();
        const dataTables_scrollHead_Height = $(this.$el).find('.dataTables_scrollHead').outerHeight();
        const dataTables_paginate_Height   = $(this.$el).find('.dataTables_paginate.paging_simple_numbers').outerHeight();
        const editingSaveAllFormHeight     = $('.editing-save-all-form').outerHeight();
        let dataTables_scrollBody_Height   = (
          formBodyHeight
          - formFooterHeight
          - relationHeaderTitle
          - relationHeaderTools
          - dataTables_scrollHead_Height
          - dataTables_paginate_Height
          - editingSaveAllFormHeight
        );

        if (this.isVectorRelation && this.showAddVectorRelationTools) {
          dataTables_scrollBody_Height = dataTables_scrollBody_Height - $(this.$refs.relation_vector_tools).outerHeight();
        }

        $(this.$refs.relation_body).find('div.dataTables_scrollBody').height(dataTables_scrollBody_Height);

        relationsTable && relationsTable.columns.adjust();
      },

      unlinkRelation(index) {
        this._service.unlinkRelation(index)
      },

      copyFeatureFromOtherLayer() {
        const EditingService = require('../services/editingservice');
        const copyLayer      = this.copyFeatureLayers.find(layerObj => layerObj.id === this.copylayerid);
        this._service
          .addRelationFromOtherLayer({
            layer: copyLayer.external ?
              EditingService.getMapService().getLayerById(this.copylayerid) :
              EditingService.getProjectLayerById(this.copylayerid),
            external: copyLayer.external,
          });
      },

      addVectorRelation() {
        this._service.addRelation();
        this.showAddVectorRelationTools = false;
      },

      async addRelationAndLink() {
        if (this.isVectorRelation && this.copyFeatureLayers.length) {
          this.showAddVectorRelationTools = !this.showAddVectorRelationTools;
          await this.$nextTick();
          this.resize();
        } else {
          this._service.addRelation();
        }
      },

      startTool(relationtool, index) {
        this._service
          .startTool(relationtool, index)
          .then(() => {})                        // <-- TODO: double check this
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
        const fields   = this.relationsFields(relation);
        fields.forEach(field => {
          if (!Array.isArray(field.value)) {
            attributes.push({
              label: field.label,
              value: field.value
            })
          }
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

      isLink(field) {
        return ['photo', 'link'].indexOf(this.getFieldType(field)) !== -1;
      },

      getValue(value) {
        if (value && 'Object' === toRawType(value)) {
          value = value.value;
        } else if ('string' == typeof value && 0 === value.indexOf('_new_')) {
          value = null;
        }
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
        relationsTable = $('.g3wform-relation-table')
          .DataTable({
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

      destroyTable() {
        if (relationsTable) {
          relationsTable = relationsTable.destroy();
          relationsTable = null;
          $('#filterRelation').off();
        }
      },

      /**
       * @returns {Promise<void>}
       * 
       * @since 3.7.0
       */
      async updateTable() {
        this.destroyTable();     // destroy old table
        this.show = false;       // set show false to hide table
        await this.$nextTick();  // wait rerender
        this.show = true;        // show with new relations array
        await this.$nextTick();
        this._createDataTable(); // recreate table
      },

    },

    computed: {

      showTable() {
        return this.relations.length > 0 && this.show;
      },

      fieldrequired() {
        return this._service.isRequired();
      },

      enableAddLinkButtons() {
        return (
          (this.relations.length === 0) ||
          (this.relation.type !== 'ONE')
        );
      },

    },

    watch: {

      relations(updatedrelations=[]) {
        if (0 === updatedrelations.length) {
          this.destroyTable(); // destroy table when there are no relations
        } else {
          this.updateTable(); // update table when deleting / adding row relations
        }
      },

    },

    beforeCreate() {
      this.delayType = 'debounce';
    },

    created() {
  
      const EditingService  = require('../services/editingservice');
      const relationLayer   = EditingService.getLayerById(this.relation.child);
  
      this.isVectorRelation = relationLayer.getType() === Layer.LayerTypes.VECTOR;

      const is_vector       = this.isVectorRelation;

      // In case of vector relation
      if (is_vector) {
        // get all project layer that has same geometry
        this.copyFeatureLayers = EditingService
          .getProjectLayersWithSameGeometryOfLayer(relationLayer, {exclude:[this.relation.father]})
          .map(layer => ({
            id:       layer.getId(),
            name:     layer.getName(),
            external: false
          }));

        EditingService
          .getExternalLayersWithSameGeometryOfLayer(relationLayer)
          .forEach(externalLayer => {
            this.copyFeatureLayers.push({
              id:       externalLayer.get('id'),
              name:     externalLayer.get('name'),
              external: true
            })
          });
      }

      if (is_vector && this.copyFeatureLayers.length > 0) {
        // sort by name
        this.copyFeatureLayers
          .sort(({name:name1}, {name:name2}) => {
            name1 = name1.toLowerCase();
            name2 = name2.toLowerCase();
            if (name1 < name2) return -1;
            if (name1 > name2) return 1;
            return 0;
          });
        // in case of fin at least one layer, set current layer id
        this.copylayerid = this.copyFeatureLayers[0].id;
      }

      if (is_vector && !(this.copyFeatureLayers.length > 0)) {
        this.copylayerid = null;
      }

      this.loadEventuallyRelationValuesForInputs = false;
  
      this._service = new RelationService(this.layerId, {
        relation:  this.relation, // main relation between layerId (current in editing)
        relations: this.relations // relation related to current feature of current layer in editing
      });

      this.capabilities = this._service.getEditingCapabilities();

      this.formeventbus.$on('changeinput', this.updateExternalKeyValueRelations);

    },

    async activated() {

      this.active = true;

      this.showAddVectorRelationTools = false;

      if (!this.loadEventuallyRelationValuesForInputs) {
        const EditingService = require('../services/editingservice');
        EditingService.runEventHandler({
          type: 'show-relation-editing',
          id:   EditingService._getRelationId({ layerId: this.layerId, relation: this.relation }),
          component: this,
        });
        this.loadEventuallyRelationValuesForInputs = true;
      }

      await this.$nextTick();

      if (!relationsTable && this.showTable) {
        this._createDataTable();
      }

      this.resize();
    },

    deactivated() {
      this.destroyTable();
      this.active = false;
    },

    beforeDestroy() {
      this.loadEventuallyRelationValuesForInputs = true;
    },

  };
</script>

<style scoped>
  .g3w-editing-new-relation-vector-type {
    margin-bottom: 5px;
    font-weight: bold;
  }
</style>