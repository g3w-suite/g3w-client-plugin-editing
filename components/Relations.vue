<template>
    <div id="feature_relations_form">
        <relation
          :relation="relation.relation"
          :relations="relation.relations"
          :resourcesurl="resourcesurl"
          :formeventbus="formeventbus">
        </relation>
    </div>
</template>

<script>
    import RelationComponent from './Relation.vue';

    export default {
      name: 'Relations',
      components: {
        'relation': RelationComponent
      }
    };
</script>
