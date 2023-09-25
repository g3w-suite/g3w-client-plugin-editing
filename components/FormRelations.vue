<!-- ORIGINAL SOURCE: -->
<!-- form/components/relations/vue/relations.html@v3.4 -->
<!-- form/components/relations/vue/relations.js@v3.4 -->

<template>
  <div id="feature_relations_form">
    <relation
      :relation     = "relation.relation"
      :relations    = "relation.relations"
      :resourcesurl = "resourcesurl"
      :formeventbus = "formeventbus"
    />
  </div>
</template>

<script>
  import FormRelationComponent from './FormRelation.vue';

  export default {
    name: 'Relations',
    components: {
      'relation': FormRelationComponent
    }
  };
</script>
