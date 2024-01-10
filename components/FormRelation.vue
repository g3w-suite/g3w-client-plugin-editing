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
          background-color: #fff;
        "
      >
        <span v-t-plugin="'editing.edit_relation'"></span>
        <span style="margin-left: 2px;">: {{ relation.name.toUpperCase() }}</span>
      </div>

      <!-- RELATION TOOLS -->
      <div
        ref   = "relation_header_tools"
        class = "box-header with-border"
        style = "
          width: 100%;
          display: flex;
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
            :class                    = "[{ 'disabled': !enableAddLinkButtons }, g3wtemplate.font['link']]"
          ></span>

          <!-- ADD FEATURE -->
          <span
            v-if                      = "undefined !== capabilities.relation.find(capability => 'add_feature' === capability)"
            v-t-tooltip:bottom.create = "tooltips.add_relation"
            @click                    = "enableAddLinkButtons ? addRelationAndLink() : null"
            class                     = "g3w-icon add-link pull-right"
            :class                    = "[{ 'disabled' : !enableAddLinkButtons }, g3wtemplate.font['plus']]"
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
          <div
            class="g3w-editing-new-relation-vector-type"
            v-t-plugin="'editing.relation.draw_new_feature'">
          </div>
          <button
            class       = "btn skin-button"
            style       = "width: 100%"
            @click.stop = "addVectorRelation"
          >
            <i :class="g3wtemplate.font['pencil']"></i>
          </button>
        </div>

        <divider/>

        <div
          style="align-self: center"
          v-t-plugin="'editing.relation.draw_or_copy'">
        </div>

        <divider/>

        <div
          id    = "g3w-select-editable-layers-content"
          style = "
flex-grow: 1;
display: flex;
flex-direction: column
"
        >

          <div
            class="g3w-editing-new-relation-vector-type"
            v-t-plugin="'editing.relation.copy_feature_from_other_layer'">
          </div>

        <select
          id        = "g3w-select-editable-layers-to-copy"
          v-select2 = "'copylayerid'"
        >
          <option
            v-for  = "copyFeatureLayer in copyFeatureLayers"
            :key   = "copyFeatureLayer.id"
            :value = "copyFeatureLayer.id">
              {{ copyFeatureLayer.name }}
          </option>
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
          v-if  = "relationsLength"
          ref   = "relationTable"
          class = "table g3wform-relation-table table-striped"
          style = "width:100%"
        >
          <thead>
            <tr>
              <th v-t="'tools'"></th>
              <th></th>
              <th v-for="attribute in relationAttributesSubset(relations[0])">
                {{ attribute.label }}
              </th>
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
                v-show = "!showAllFields(index)"
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
                  <span v-else>{{ getValue(_service.getRelationFeatureValue(relation.id, attribute.name)) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
</template>

<script>

  /** @FIXME circular dependency ? */
  // import EditingService from "../services/editingservice";

  const { tPlugin: t }  = g3wsdk.core.i18n;
  const { toRawType }   = g3wsdk.core.utils;
  const RelationService = require('../services/relationservice');
  const { Layer }       = g3wsdk.core.layer;
  const {
    fieldsMixin,
    resizeMixin,
    mediaMixin,
  }                     = g3wsdk.gui.vue.Mixins;

  export default {

    mixins: [
      mediaMixin,
      fieldsMixin,
      resizeMixin,
    ],

    name: 'g3w-relation',

    data() {
      return {
        loading : false,
        showAddVectorRelationTools: false,
        copylayerid:                null, // used for vector relation layer
        active:                     false,
        showallfieldsindex:         null,
        tooltips: {
          add_relation:            "plugins.editing.form.relations.tooltips.add_relation",
          link_relation:           "plugins.editing.form.relations.tooltips.link_relation",
          open_relation_tool:      "plugins.editing.form.relations.tooltips.open_relation_tools",
          unlink_relation:         "plugins.editing.form.relations.tooltips.unlink_relation",
        },
        value:                     null,
        placeholdersearch:         `${t('editing.search')} ...`,
      };
    },

    methods: {
      /**
       * Resize method to adapt table when window is resized
       */
      resize() {
        // skip when relation form is disabled (or hidden) 
        if (!(this.active && 'none' !== this.$el.style.display)) {
          return;
        }

        $(this.$refs.relation_body)
          .find('div.dataTables_scrollBody')
          .height(
              $(".g3wform_body:visible").height()
            - $('.g3wform_footer:visible').height()
            - $(this.$refs.relation_header_title).outerHeight()
            - $(this.$refs.relation_header_tools).outerHeight()
            - $(this.$el).find('.dataTables_scrollHead').outerHeight()
            - $(this.$el).find('.dataTables_paginate.paging_simple_numbers').outerHeight()
            - $('.editing-save-all-form:visible').outerHeight()
            - (this.isVectorRelation && this.showAddVectorRelationTools ? $(this.$refs.relation_vector_tools).outerHeight() : 0)
          );

        if (this.relationsTable) {
          this.relationsTable.columns.adjust();
        }

      },

      /**
       * Method to unlink the relation
       * @param index
       */
      unlinkRelation(index) {
        this._service.unlinkRelation(index)
      },

      /**
       * @FIXME add description
       */
      copyFeatureFromOtherLayer() {
        const EditingService = require('../services/editingservice');

        const copyLayer      = this.copyFeatureLayers.find(layerObj => layerObj.id === this.copylayerid);

        this._service.addRelationFromOtherLayer({
          layer: copyLayer.external ?
            EditingService.getMapService().getLayerById(this.copylayerid) :
            EditingService.getProjectLayerById(this.copylayerid),
          external: copyLayer.external
        });
      },

      /**
       * @FIXME add description
       */
      addVectorRelation() {
        this._service.addRelation();
        this.showAddVectorRelationTools = false;
      },

      /**
       * @FIXME add description
       */
      async addRelationAndLink() {
        if (this.isVectorRelation && this.copyFeatureLayers.length) {
          this.showAddVectorRelationTools = !this.showAddVectorRelationTools;
          await this.$nextTick();
          this.resize();
        } else {
          this._service.addRelation();
        }
      },

      /**
       * @FIXME add description
       */
      startTool(relationtool, index) {
        this._service
          .startTool(relationtool, index)
          .then(() => {})
          .catch(console.warn)
      },

      /**
       * @FIXME add description
       */
      linkRelation() {
        this._service.linkRelation();
      },

      /**
       * @FIXME add description
       */
      updateExternalKeyValueRelations(input) {
        this._service.updateExternalKeyValueRelations(input);
      },

      /**
       * @FIXME add description
       */
      isRequired() {
        return this._service.isRequired();
      },

      /**
       * @returns { Array } attributes 
       */
      relationAttributesSubset(relation) {
        return this
          .relationsFields(relation)
          .flatMap(({ name, label, value }) => Array.isArray(value) ? [] : [{ name, label, value }]);
      },

      /**
       * @FIXME add description
       */
      relationsAttributesSubsetLength(relation) {
        return this.relationAttributesSubset(relation).length > 0;
      },

      /**
       * @FIXME add description
       */
      relationsFields(relation) {
        return this._service.relationFields(relation);
      },

      /**
       * @FIXME add description
       */
      showAllRelationFields(index) {
        this.showallfieldsindex = this.showallfieldsindex == index ? null : index;
      },

      /**
       * @FIXME add description
       */
      showAllFields(index) {
        return this.showallfieldsindex == index;
      },

      /**
       * @FIXME add description
       */
      getRelationTools() {
        return this._service.getRelationTools();
      },

      /**
       * @FIXME add description
       */
      isLink(field) {
        return -1 !== ['photo', 'link'].indexOf(this.getFieldType(field));
      },

      /**
       * @FIXME add description
       */
      getValue(value) {
        if (value && toRawType(value) === 'Object') {
          value = value.value;
        } else if ('string' == typeof value && 0 === value.indexOf('_new_')) {
          value = null;
        }
        this.value = value;
        return value;
      },

      /**
       * @FIXME add description
       */
      getFileName(value) {
        return this.getValue(value).split('/').pop();
      },

      /**
       * @FIXME add description
       */
      _setDataTableSearch() {
        const relationsTable = this.relationsTable;
        $('#filterRelation').on('keyup', function() { relationsTable.search($(this).val()).draw(); });
      },

      /**
       * @FIXME add description
       */
      _createDataTable() {
        this.relationsTable = $(this.$refs.relationTable).DataTable({
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

      /**
       * @FIXME add description
       */
      destroyTable() {
        if (this.relationsTable) {
          this.relationsTable = this.relationsTable.destroy();
          this.relationsTable = null;
          $('#filterRelation').off();
        }
      },

      /**
       * @returns {Promise<void>}
       * 
       * @since g3w-client-plugin-editing@v3.7.0
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

      /**
       * @returns { boolean }
       */
      relationsLength() {
        return this.relations.length > 0;
      },

      /**
       * @returns { boolean }
       */
      fieldrequired() {
        return this._service.isRequired();
      },

      /**
       * @returns { boolean }
       */
      enableAddLinkButtons() {
        return (
          (this.relations.length === 0) ||
          (this.relation.type !== 'ONE')
        );
      },

    },

    watch: {

      /**
       * @FIXME add description
       */
      relations(updatedrelations = []) {
        if (0 === updatedrelations.length) {
          this.destroyTable(); // destroy table when there are no relations
        } else {
          this._new_relations_ids = this._new_relations_ids
            .filter(({clientid, id}) => {
              const newrelation = this.relations.find(r => clientid === r.id);
              if (newrelation) {
                newrelation.id = id;
                return false;
              }
            })
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

      /** @since 3.7.2 Store array of new relations features objects saved on server id
       * {clientid, id} where client id is a temporary id of relation feature, id is saved id on server
       * */
      this._new_relations_ids = [];

      /** @since 3.7.2  Method to listen commit on server when press disk icon save all form*/
      this.listenNewCommitRelations = ({new_relations={}}) => {
        if (new_relations[relationLayer.getId()]) {
          this._new_relations_ids = this._new_relations_ids
            .concat((new_relations[relationLayer.getId()].new || []).map(({clientid, id}) => ({clientid, id})));
        }
      };

      /** @since 3.7.2 Listen commit whe is click on save all button disk icon*/
      EditingService.on('commit', this.listenNewCommitRelations);

      this.isVectorRelation = relationLayer.getType() === Layer.LayerTypes.VECTOR;

      // vector relation --> get all layers with same geometry
      if (this.isVectorRelation) {
        const project_layers  = EditingService.getProjectLayersWithSameGeometryOfLayer(relationLayer, { exclude: [this.relation.father] });
        const external_layers = EditingService.getExternalLayersWithSameGeometryOfLayer(relationLayer);
        const layers          = [];

        for (const layer of project_layers) {
          layers.push({
            id: layer.getId(),
            name: layer.getName(),
            external: false,
          });
        }

        for (const layer of external_layers) {
          layers.push({
            id: layer.get('id'),
            name: layer.get('name'),
            external: true,
          });
        }

        this.copyFeatureLayers = layers.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())); // sorted by name
        this.copylayerid       = this.copyFeatureLayers.length ? this.copyFeatureLayers[0].id : null;             // current layer = first layer found
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
      this.showAddVectorRelationTools = false;

      if (!this.loadEventuallyRelationValuesForInputs) {
        const EditingService = require('../services/editingservice');
        this.loading = true;
        try {
          await EditingService.runEventHandler({
            type:      'show-relation-editing',
            id:        EditingService._getRelationId({ layerId: this.layerId, relation: this.relation }),
            component: this,
          });
        } catch(err) {
          console.warn(err)
        }

        this.loading = false;

        this.loadEventuallyRelationValuesForInputs = true;
      }


      this.active = true;

      await this.$nextTick();

      if (!this.relationsTable && this.relationsLength) {
        this._createDataTable();
      }

      this.resize();
    },

    deactivated() {
      this.destroyTable();
      this.active = false;
    },

    beforeDestroy() {
      const EditingService  = require('../services/editingservice');
      this.loadEventuallyRelationValuesForInputs = true;
      //set to null for garbage collection
      this._new_relations_ids = null;
      //unlisten
      EditingService.off('commit',this.listenNewCommitRelations);
    },

  };
</script>

<style scoped>
  .g3w-editing-new-relation-vector-type {
    margin-bottom: 5px;
    font-weight: bold;
  }
</style>