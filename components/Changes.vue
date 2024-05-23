<!--
  @since g3w-client-plugin-editing@v3.8.0
  @file
-->
<template>
  <div>

    <h4
      v-if           = "relation"
      class          = "skin-color g3w-long-text"
      style          = "font-weight: bold; margin: 15px 0"
      v-t-plugin:pre = "'editing.messages.commit.header_relation'"
    >: {{ layer.getName() }}</h4>

    <template
      v-for = "c in Object.keys(commits).filter(c => commits[c].length)"
    >
      <h4 v-t-plugin:pre="`editing.messages.commit.${c}`"> ({{ commits[c].length }}) </h4>
      <divider />
      <ul>
        <li v-for="item in commits[c]">
          <details>
            <summary>{{ getType(item) }} #{{ getId(item) }}</summary>
            <template v-for ="[key, val] in getAttrs(item)">
              <dl v-if="hasValue(item, key)">
                <dt>{{ key }}:</dt>
                <dd>
                  <template v-if="isEdited(item, key)">
                    <del ref="value">{{ getValue(item, key) }}</del> ← <ins ref="value">{{ getEditingValue(item, key) }}</ins>
                  </template>
                  <span v-else ref="value">{{ getEditingValue(item, key) || getValue(item, key) }}</span>
                  <i v-if="'geometry' === key"><code>&lt;coords&gt;</code></i>
                </dd>
              </dl>
            </template>
          </details>
        </li>
      </ul>
    </template>

    <changes
      v-for     = "([id, commits]) in Object.entries(commits.relations)"
      :commits  = "{ add: commits.add, update: commits.update, delete: commits.delete, relations: commits.relations }"
      :relation = "true"
      :layer    = "getLayerById(id)"
    />

  </div>

</template>

<script>
import { areCoordinatesEqual }       from '../utils/areCoordinatesEqual';
import { getFeatureTableFieldValue } from '../utils/getFeatureTableFieldValue';

export default {

  name: "changes",

  props: {
    commits: {
      type:     Object,
      required: true,
    },
    layer: {
      type:    Object,
      required: true,
    },
    relation: {
      type:    Boolean,
      default: false
    }
  },

  data() {
    return {
      features:  this.layer.readFeatures(),        // original features
      efeatures: this.layer.readEditingFeatures(), // edited features,
    };
  },

  methods: {

    getFormattedValue(feat, key) {
      if (!feat) {
        return;
      }
      if ('geometry' === key) {
        const coords = feat.get(key).getFlatCoordinates().length / 2;
        return `(${coords})`;
      }
      return getFeatureTableFieldValue({
        layerId: this.layer.getId(),
        feature: feat,
        property: key
      });
    },

    getValue(item, key) {
      return this.getFormattedValue(this.getFeature(item), key);
    },

    getEditingValue(item, key) {
      return this.getFormattedValue(this.getEditingFeature(item), key);
    },

    hasValue(item, key) {
      const feat  = this.getFeature(item);
      const efeat = this.getEditingFeature(item); // NB: undefined when deleted
      if (
        (feat && efeat && null === feat.get(key) && null === efeat.get(key)) ||
        (feat && !efeat && null === feat.get(key))
      ) {
        return false;
      }
      return true;
    },

    /**
     * @returns { string } item id (when deleted is the item itself) 
     */
    getId(item) {
      return item.id || item;
    },

    /**
     * @returns edited feature
     */
    getEditingFeature(item) {
      const id = this.getId(item);
      return this.efeatures.find(f => id === f.getId());
    },

    /**
     * @returns original feature
     */
    getFeature(item) {
      const id = this.getId(item);
      return this.features.find(f => id === f.getId());
    },

    /**
     * @returns { string } layer type or empty string when geometry is undefined (alphanumerical layer)
     */
    getType(item) {
      const feat = this.getEditingFeature(item) || this.getFeature(item); // when deleted fallbacks to original feature
      return feat && feat.getGeometry && feat.getGeometry() ? feat.getGeometry().getType() : ''
    },

    /**
     * @returns { boolean } whether feature property has been edited 
     */
    isEdited(item, key) {
        const feat  = this.getFeature(item); // NB: undefined when added
        const efeat = this.getEditingFeature(item); // NB: undefined when deleted
        if ([feat, efeat].includes(undefined)) { return false }
        if (this.getType(item) && 'geometry' === key) {
          return !areCoordinatesEqual({ feature: feat, coordinates: efeat.get(key).getCoordinates() });
        }
        return efeat.get(key) !== feat.get(key);
    },

    getAttrs(item) {
      const feat = this.getEditingFeature(item) || this.getFeature(item); // when deleted fallbacks to original feature
      return Object.entries(feat ? feat.getProperties() : {}).sort((a, b) => a[0] > b[0])
    },

    getLayerById(id) {
      return g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing').service.getLayerById(id);
    },

  },

  async mounted() {
    // insert a visual reference for `<empty>` values
    this.$refs.value.filter(d => !d.textContent).forEach(d => d.innerHTML = `<i><code>&lt;empty&gt;</code></i>`);
  },

};
</script>

<style scoped>
  summary {
    display: list-item;
    font-weight: bold;
    padding: 0.5em;
    cursor: pointer;
    background-color: rgb(255, 255, 0, 0.25);
    font-size: medium;
    user-select: none;
  }
  ul {
    list-style: none;
    padding-left: 0;
  }
  ul > li {
    margin-bottom: 8px;
  }
  ins {
    background-color: lime;
    text-decoration-line: none;
  }
  del {
    background-color: tomato;
  }
  dl {
    display: grid;
    grid-template: auto / .5fr 1fr;
    margin-bottom: 0;
    word-break: break-all;
  }
  dt {
    background: #fee;
  }
  dd {
    background: hsl(220, 10%, 95%);
  }
  dt, dd {
    margin: 0;
    padding: .3em .5em;
    border-top: 1px solid #fff;
  }
</style>