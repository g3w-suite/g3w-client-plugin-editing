<!-- ORIGINAL SOURCE: -->
<!-- form/components/relation/vue/relation.html@v3.4 -->
<!-- form/components/relation/vue/relation.js@v3.4 -->

<template>
  <div
      v-disabled  = "loading"
      style       = "margin-bottom: 5px;"
    >
      <bar-loader :loading="loading"/>

      <!-- RELATION TITLE -->
      <div
        ref   = "relation_header_title"
        class = "relation_header_title box-header with-border skin-color"
      >
        <span v-t-plugin="'editing.edit_relation'"></span>
        <span style="margin-left: 2px;">: {{ relation.name.toUpperCase() }}</span>
      </div>

      <!-- RELATION TOOLS -->
      <div
        ref   = "relation_header_tools"
        class = "relation_header_tools box-header with-border"
      >

        <!-- SEARCH BOX -->
        <div id="search-box">
          <input
            v-if         = "relationsLength"
            type         = "text"
            class        = "form-control"
            id           = "filterRelation"
            :placeholder = "placeholdersearch"
          >
        </div>

        <div class="g3w-editing-relations-add-link-tools">

          <!-- CHANGE ATTRIBUTE -->
          <span
            v-if                      = "capabilities.includes('change_attr_feature')"
            class                     = "g3w-icon add-link"
            align                     = "center"
            v-t-tooltip:bottom.create = "'plugins.editing.form.relations.tooltips.link_relation'"
            @click.stop               = "show_add_link ? linkRelation() : null"
            :class                    = "[{ 'disabled': !show_add_link }, g3wtemplate.font['link']]"
          ></span>

          <!-- ADD FEATURE -->
          <span
            v-if                      = "capabilities.includes('add_feature')"
            v-t-tooltip:bottom.create = "'plugins.editing.form.relations.tooltips.add_relation'"
            @click                    = "show_add_link ? addRelationAndLink() : null"
            class                     = "g3w-icon add-link pull-right"
            :class                    = "[{ 'disabled' : !show_add_link }, g3wtemplate.font['plus']]"
          ></span>

        </div>

      </div>

      <!-- VECTOR RELATION TOOLS -->
      <section
        v-if  = "show_vector_tools"
        ref   = "relation_vector_tools"
        class = "relation_vector_tools"
      >

        <span
          @click.stop = "closeVectorTools"
          class       = "close_vector_relation_tool"
        >
          <i class="g3w-icon skin-color" :class="g3wtemplate.font['close']"></i>
        </span>

        <!-- ADD VECTOR RELATION -->
        <div>
          <div
            class      = "g3w-editing-new-relation-vector-type"
            v-t-plugin = "'editing.relation.draw_new_feature'">
          </div>
          <button
            class       = "btn skin-button"
            style       = "width: 100%"
            @click.stop = "addVectorRelation"
          >
            <i :class="g3wtemplate.font['pencil']"></i>
          </button>
        </div>

        <!-- COPY FEATURE FROM OTHER LAYER -->
        <section v-if="copyFeatureLayers.length > 0">

          <span class="divider"></span>

          <div
            style      = "align-self: center"
            v-t-plugin = "'editing.relation.draw_or_copy'"
          ></div>

          <span class="divider"></span>

          <div id="g3w-select-editable-layers-content">

            <div
              class      = "g3w-editing-new-relation-vector-type"
              v-t-plugin = "'editing.relation.copy_feature_from_other_layer'"
            ></div>

            <select
              id        = "g3w-select-editable-layers-to-copy"
              v-select2 = "'copylayerid'"
            >
              <option
                v-for  = "layer in copyFeatureLayers"
                :key   = "layer.id"
                :value = "layer.id"
              >{{ layer.name }}</option>
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

      </section>

      <!-- RELATION CONTENT -->
      <div
        ref        = "relation_body"
        class      = "relation_body box-body"
        v-disabled = "disabled"
      >
        <table
          v-if  = "relationsLength > 0 && !update"
          ref   = "relationTable"
          class = "table g3wform-relation-table table-striped"
        >
          <thead>
            <tr>
              <th v-t="'tools'"></th>
              <th></th>
              <th v-for="attribute in relationAttributesSubset(relations[0])">{{ attribute.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for = "(relation, index) in relations"
              :key  = "relation.id"
              class = "featurebox-header"
            >
              <td>
                <div style="display: flex">
                  <!-- RELATION TOOLS -->
                  <div
                    v-for                    = "tool in _service.getTools(index)"
                    :key                     = "tool.state.id"
                    class                    = "editbtn enabled"
                    :class                   = "{ 'toggled': tool.state.active }"
                    @click.stop              = "startTool(tool, index)"
                    v-t-tooltip:top.create   = "`plugins.${tool.state.name}`"
                  >
                    <img
                      height = "20px"
                      width  = "20px"
                      :src   = "`${resourcesurl}images/${tool.state.icon}`"
                    />
                  </div>
                </div>
              </td>
              <td class="action-cell">
                <div
                  v-if                     = "!fieldrequired && capabilities.includes('change_attr_feature')"
                  class                    = "g3w-mini-relation-icon g3w-icon"
                  :class                   = "g3wtemplate.font['unlink']"
                  @click.stop              = "_service.unlinkRelation(index)"
                  v-t-tooltip:right.create = "'plugins.editing.form.relations.tooltips.unlink_relation'"
                  aria-hidden              = "true"
                ></div>
              </td>
              <td v-for  = "attribute in relationAttributesSubset(relation)">
                <!-- MEDIA ATTRIBUTE-->
                <div
                  v-if = "isMedia(attribute.value) && getValue(attribute.value)"
                  class = "preview"
                >
                  <a :href="getValue(attribute.value)" target="_blank">
                    <div
                      class  = "previewtype"
                      :class = "getMediaType(attribute.value.mime_type).type"
                    >
                      <i class="fa-2x" :class="g3wtemplate.font[getMediaType(attribute.value.mime_type).type]"></i>
                    </div>
                  </a>
                  <div class="filename">{{ getValue(attribute.value).split('/').pop() }}</div>
                </div>
                <!-- LINK ATTRIBUTE -->
                <a
                  v-else-if = "['photo', 'link'].includes(getFieldType(attribute))"
                  :href     = "getValue(attribute.value)"
                  target    = "_blank">{{ getValue(attribute.value) }}
                </a>
                <!-- TEXTUAL ATTRIBUTE -->
                <span v-else>{{ getValue(getRelationFeatureValue(relation.id, attribute.name)) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

  </div>
</template>

<script>

  import { getRelationFieldsFromRelation }            from '../utils/getRelationFieldsFromRelation';
  import { getRelationId }                            from '../utils/getRelationId';
  import { getFeatureTableFieldValue }                from '../utils/getFeatureTableFieldValue';
  import { getEditingLayerById }                      from '../utils/getEditingLayerById';

  const { CatalogLayersStoresRegistry } = g3wsdk.core.catalog;
  const { Geometry }                    = g3wsdk.core.geometry;
  const { isSameBaseGeometryType }      = g3wsdk.core.geoutils;
  const { tPlugin: t }                  = g3wsdk.core.i18n;
  const { toRawType }                   = g3wsdk.core.utils;
  const { Layer }                       = g3wsdk.core.layer;
  const { GUI }                         = g3wsdk.gui;
  const {
    fieldsMixin,
    resizeMixin,
    mediaMixin,
  }                                     = g3wsdk.gui.vue.Mixins;

  const RelationService                 = require('../services/relationservice');

  export default {

    mixins: [
      mediaMixin,
      fieldsMixin,
      resizeMixin,
    ],

    name: 'g3w-relation',

    data() {
      return {
        loading :           false,
        show_vector_tools:  false, // whether show vector relation tools
        disabled:           false, //disable relatins rows
        copylayerid:        null,  // used for vector relation layer
        copyFeatureLayers:  [],
        active:             false,
        value:              null,
        placeholdersearch:  `${t('editing.search')} ...`,
        resourcesurl:       GUI.getResourcesUrl(),
      };
    },

    methods: {

      /**
       * Adapt table when a window is resized
       */
      resize() {
        // skip when a relation form is disabled (or hidden)
        if (!(this.active && 'none' !== this.$el.style.display)) {
          return;
        }

        const table = this.$refs.relation_body.querySelector('div.dataTables_scrollBody');

        if (table) {
          table.style.height =
              ((document.querySelector('.g3wform_body')                                     || {}).offsetHeight || 0)
            - ((document.querySelector('.g3wform_footer')                                   || {}).offsetHeight || 0)
            - ((this.$refs.relation_header_title                                                     || {}).offsetHeight || 0)
            - ((this.$refs.relation_header_tools                                                     || {}).offsetHeight || 0)
            - ((this.$el.querySelector('.dataTables_scrollHead')                                     || {}).offsetHeight || 0)
            - ((this.$el.querySelector('.dataTables_paginate.paging_simple_numbers')                 || {}).offsetHeight || 0)
            - ((document.querySelector('.editing-save-all-form')                            || {}).offsetHeight || 0)
            - (( this.isVectorRelation && this.show_vector_tools && this.$refs.relation_vector_tools || {}).offsetHeight || 0)
            + 'px';
        }

        if (this.relationsTable) {
          this.relationsTable.columns.adjust();
        }

      },

      /**
       * @FIXME add description
       */
      copyFeatureFromOtherLayer() {
        const copyLayer      = this.copyFeatureLayers.find(layer => layer.id === this.copylayerid);

        this._service.addRelationFromOtherLayer({
          layer: copyLayer.external ?
            GUI.getService('map').getLayerById(this.copylayerid) :
            CatalogLayersStoresRegistry.getLayerById(this.copylayerid),
          external: copyLayer.external
        });
      },

      /**
       * @since g3w-client-plugin-editing@v3.8.0
       */
      async closeVectorTools() {
        this.show_vector_tools = false;
        await this.$nextTick();
        this.resize();
      },

      /**
       * @FIXME add description
       */
      addVectorRelation() {
        this._service.addRelation();
        this.show_vector_tools = false;
      },

      /**
       * @since 3.8.0
        * @return {Promise<void>}
       */
      async linkRelation() {
        this.disabled = true;
        await this._service.linkRelation();
        this.disabled = false;
      },


      /**
       * @FIXME add description
       */
      async addRelationAndLink() {
        if (this.isVectorRelation) {
          this.show_vector_tools = !this.show_vector_tools;
          await this.$nextTick();
          this.resize();
        } else {
          this._service.addRelation();
        }
      },

      /**
       * @FIXME add description
       */
      startTool(tool, index) {
        this._service
          .startTool(tool, index)
          .then(() => {})
          .catch(console.warn)
      },

      /**
       * @returns { Array } attributes 
       */
      relationAttributesSubset(relation) {
        return relation.fields
          .map(({ label, name, value }) => ({ name, label, value }))
          .flatMap(({ name, label, value }) => Array.isArray(value) ? [] : [{ name, label, value }]);
      },

      /**
       * @FIXME add description
       */
      getValue(value) {
        if (value && 'Object' === toRawType(value)) {
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
      _createDataTable() {
        this.relationsTable = $(this.$refs.relationTable)
          .DataTable({
            scrollX:        true,
            order:          [ 2, 'asc' ],
            destroy:        true,
            scrollResize:   true,
            scrollCollapse: true,
            responsive:     true,
            pageLength:     10,
            columnDefs:     [ { orderable: false, targets: [0, 1] } ],
            autoWidth:      false,
          });

        $(".dataTables_filter, .dataTables_length").hide();
        // set data table search
        $('#filterRelation').on('keyup', () => { this.relationsTable.search($(this).val()).draw(); });
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
        await this.$nextTick();  // wait rerender
        this._createDataTable(); // recreate table
        setTimeout(() => this.resize())
      },

      /**
       * In case of commit new relation to server, update temporary relation.id (__new__)
       * to saved id on server. It is called when a new relation is saved on a relation form
       * after click on save all disks, and when save all disks are click on a list of relation
       * table.
       * 
       * @since g3w-client-plugin-editing@v3.7.4
       */
      updateNewRelationId() {
        this._new_relations_ids.forEach(({ clientid, id }) => {
          const newrelation = this.relations.find(r => clientid === r.id);
          if (newrelation) {
            newrelation.id = id;
            //replace tools with new id
            (
              this._service.tools
              .find(ts => ts.find(t => t.state.id.split(`${clientid}_`).length > 1))
            || []
            )
              .forEach(t => t.state.id = t.state.id.replace(`${clientid}_`, `${id}_`));

          }
        })

      },

      /**
       * Listen to commit on server when press disk icon saves all form
       * 
       * @since g3w-client-plugin-editing@v3.7.4
       */
      listenNewCommitRelations({ new_relations = {} }) {
        const relationLayer = getEditingLayerById(this.relation.child);

        // there is a new relation saved on server
        if (new_relations[relationLayer.getId()] && Array.isArray(new_relations[relationLayer.getId()].new)) {
          this._new_relations_ids = [
            ...(this._new_relations_ids || []),
            ...new_relations[relationLayer.getId()].new.map(({ clientid, id }) => ({ clientid, id }))
          ]
        }
      },

      /**
       * Changes the relation field value when and if the parent changes the value of relation field
       * 
       * @param input
       */
      updateExternalKeyValueRelations(input) {

        //ownFiled is the field of relation feature link to parent feature layer
        const { ownField, relationField } = getRelationFieldsFromRelation({
          layerId:  this._service._relationLayerId,
          relation: this._service.relation
        });

        // get if parent form input that is changing
        // is the field in relation of the current feature relation Layer

        // skip when ..
        if (false === (this._service.parent.editable.length > 0 && relationField.find(rField => rField === input.name))) {
          return;
        }

        // change currentParent Feature relation value
        this._service.parent.values[input.name] = input.value;

        // loop relation fields of current feature
        this._service.relations
          .map(relation => relation.fields.find(f => -1 !== ownField.indexOf(f.name)))
          .filter(Boolean)
          .forEach(field => {
            field.value     = this._service.parent.values[field.name];
            const relation        = this._service.getLayer().getEditingSource().getFeatureById(relation.id);
            const oRelation = relation.clone();
            relation.set(field.name, input.value);
            if (!relation.isNew()) {
              g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing')
                .getToolBoxById(this._service._relationLayerId)
                .getSession()
                .pushUpdate(this._service._relationLayerId, relation, oRelation);
            }
          });
      },

        /**
         * ORIGINAL SOURCE: g3w-client-plugin-editing@v3.7.0/services/relationservice.js
         * 
         * Get value from feature if layer has key value
         */
        getRelationFeatureValue(featureId, property) {
          return getFeatureTableFieldValue({
              layerId: this._service._relationLayerId,
              feature: this._service.getLayer().getEditingSource().getFeatureById(featureId),
              property,
            });
        },

    },

    computed: {

      /**
       * @TODO find out where `this.relations` is setted
       * 
       * @returns { boolean }
       */
      relationsLength() {
        return this.relations.length;
      },

      /**
       * @returns { boolean } whether has external fields (relation layer fields have at least one field required)
       */
      fieldrequired() {
        return getRelationFieldsFromRelation({ layerId: this._service._relationLayerId, relation: this._service.relation })
          .ownField // own Fields is a relation Fields array of Relation Layer
          .some(field => getEditingLayerById(this._service._relationLayerId).isFieldRequired(field));
      },

      /**
       * @returns { boolean } whether show adds link buttons
       */
      show_add_link() {
        return (0 === this.relations.length || 'ONE' !== this.relation.type);
      },

    },

    watch: {

      /**
       * @FIXME add description
       */
      relations(_, updatedrelations = []) {
        if (0 === updatedrelations.length) {
          this.destroyTable(); // destroy the table when there are no relations
        } else {
          // component is active (show) → need to update
          this.updateNewRelationId();
          this.updateTable(); // update table when deleting / adding row relations
        }

      },

      /**
       * Toggle dom element of relation table, based on show/hide creation of vector tools
       */
      show_vector_tools(bool) {
        this._service.enableDOMElements(!bool);
        this.disabled = bool;
      },
    },

    beforeCreate() {
      this.delayType = 'debounce';
    },

    created() {
      const relationLayer  = getEditingLayerById(this.relation.child);

      /**
       * Array of new relations features objects saved on server id
       * {clientid, id} where client id is a temporary id of relation
       * feature, id is saved id on server.
       *
       * @since g3w-client-plugin-editing@v3.7.2
       */
      this._new_relations_ids       =  [];

      this.listenNewCommitRelations = this.listenNewCommitRelations.bind(this);

      /** @since 3.7.2 Listen commit when is click on save all button disk icon*/
      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').on('commit', this.listenNewCommitRelations);

      this.isVectorRelation = Layer.LayerTypes.VECTOR === relationLayer.getType();

      // vector relation → get all layers with the same geometry
      if (this.isVectorRelation) {
        const geometryType = relationLayer.getGeometryType();
        this.copyFeatureLayers = [

          // project layers with same geometry of relation ayer
          ...CatalogLayersStoresRegistry.getLayers()
            .filter(l => ((
                l.isGeoLayer() &&
                l.getGeometryType &&
                l.getGeometryType() &&
                this.relation.father !== l.getId()
              ) && (
                l.getGeometryType() === geometryType ||
                (
                  isSameBaseGeometryType(l.getGeometryType(), geometryType) &&
                  Geometry.isMultiGeometry(geometryType)
                )
              ))
            )
            .map(l => ({
              id:       l.getId(),
              name:     l.getName(),
              external: false,
            })),

          // external layers with same geometry of relation layer
          ...GUI.getService('map').getExternalLayers()
            .filter(l => {
              const features = l.getSource().getFeatures();
              // skip when ..
              if (!(features && features.length > 0) || (features && features[0] && !features[0].getGeometry())) {
                return false;
              }
              const type = features[0].getGeometry().getType();
              return geometryType === type || isSameBaseGeometryType(geometryType, type);
            })
            .map(l => ({
              id:       l.get('id'),
              name:     l.get('name'),
              external: true,
            })),

        ].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));                   // sorted by name
      }

      this.copylayerid = this.copyFeatureLayers.length ? this.copyFeatureLayers[0].id : null; // current layer = first layer found

      this.loadEventuallyRelationValuesForInputs = false;

      this._service = new RelationService(this.layerId, {
        relation:  this.relation, // main relation between layerId (current in editing)
        relations: this.relations // relation related to current feature of current layer in editing
      });

      this.capabilities = this._service.getEditingCapabilities();

      try {
        const formservice = g3wsdk.gui.GUI.getCurrentContent().content.getService();
        formservice.getEventBus().$on('changeinput', this.updateExternalKeyValueRelations.bind(this))
      } catch (e) {
        console.warn(e);
      }

    },

    async activated() {
      //in the case of vector relation, the current extent of map whe is actived
      //it used to sto an extent of the map at the moment of possibible editing (and zoom)
      // to relation feature
      if (this.isVectorRelation) {
        this.mapExtent = GUI.getService('map').getMapBBOX();
      }

      this.show_vector_tools = false;

      if (!this.loadEventuallyRelationValuesForInputs) {
        this.loading = true;

        try {
          await g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').runEventHandler({
            type:      'show-relation-editing',
            id:        getRelationId({ layerId: this.layerId, relation: this.relation }),
            component: this,
          });
        } catch(e) {
          console.warn(e)
        }

        this.loading = false;

        this.loadEventuallyRelationValuesForInputs = true;
      }

      this.active = true;

      await this.$nextTick();

      if (!this.relationsTable && this.relations.length > 0) {
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
      // unlisten
      g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').off('commit',this.listenNewCommitRelations);
      // In the case of vector relation, restore the beginning extent of the map;
      // in the case we zoomed to relation feature
      if (this.isVectorRelation && (null !== this._service.currentRelationFeatureId)) {
        GUI.getService('map').zoomToExtent(this.mapExtent);
        this.mapExtent = null;
      }
    },

  };
</script>

<style scoped>
  .g3w-editing-new-relation-vector-type {
    margin-bottom: 5px;
    font-weight: bold;
  }
  .relation_header_title {
    width: 100%;
    display: flex;
    font-weight: bold;
    font-size: 1.3em;
    align-items: center;
    background-color: #fff;
  }
  .relation_header_tools {
    width: 100%;
    display: flex;
    background-color: #fff;
  }
  .g3w-editing-relations-add-link-tools {
    display: flex;
    justify-content: flex-end
  }
  .relation_vector_tools {
    display: flex;
    flex-direction: column;
    border: 2px solid #eee;
    background-color: #fff;
    padding: 10px;
  }
  #g3w-select-editable-layers-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column
  }
  #search-box {
    margin-right: auto;
  }
  .relation_body {
    padding: 0;
  }
  .g3wform-relation-table {
    width: 100%
  }
  .close_vector_relation_tool {
    align-self: self-end;
  }
  .close_vector_relation_tool > .g3w-icon {
    font-weight: bold;
    cursor: pointer;
  }
  .divider {
    display: block;
    position: relative;
    padding: 0;
    margin-bottom: 5px;
    height: 0;
    width: 100%;
    max-height: 0;
    font-size: 1px;
    line-height: 0;
    clear: both;
    border: none;
    border-bottom: 2px solid #eee;
  }
</style>