export default {
  close_editing_panel: {
    message: "⚠️ Pour fermer le formulaire de saisie, il faut d'abord sortir de la couche en édition"
  },
  errors: {
    no_layers: "Une erreur s'est produite lors du chargement des couches dans l'édition.",
    some_layers: "Une erreur s'est produite lors du chargement de certaines couches dans l'édition."
  },
  search: "Recherche",
  editing_changes: "Editing Changes",
  editing_data: "Modifier les données",
  editing_attributes: "Modifier les attributs de la couche ",
  relations: "Relations",
  edit_relation: "Modifier la relation",
  back_to_relations: "Retour aux relations",
  no_relations_found: "Aucune relation",
  relation_data: "Détail des relations",
  relation_already_added : "Relation déjà présente",
  list_of_relations_feature: "Lister les relations de l'entité",
  tooltip:{
    edit_layer: "Modifier la couche"
  },
  toolbox: {
    title: 'Modifier'
  },
  table: {
    edit: "Modifier les entités",
    copy: "Créer une copie",
    delete: "Supprimer l'entité"
  },
  tools: {
    copy: "Copier les entités",
    pastefeaturesfromotherlayers: "Coller des entités à partir d'autres couches",
    addpart: "Ajouter une partie à la géométrie",
    deletepart: "Supprimer la partie de la géométrie",
    merge: "Fusionner les entités",
    split: "Découper l'entité",
    add_feature: "Ajouter une entité",
    delete_feature: "Supprimer l'entité",
    move_feature: "Déplacer l'entité",
    rotate_feature: "Appliquer une rotation à l'entité",
    update_vertex: "Mettre à jour la forme de l'entité",
    update_feature: "Mettre à jour les attributs de l'entité",
    update_multi_features: "Mettre à jour les attributs des entités sélectionnées",
    update_multi_features_relations: "Mettre à jour les attributs des relations sélectionnées",
    update_multi_features_relations_from_parents : "Mettre à jour les attributs des relations à partir des entités parentes sélectionnées",
    copyfeaturefromexternallayer: "Copier une entité à partir d'une couche externe"
  },
  toolsoftool: {
    measure: "Afficher la mesure",
    snap: "Accrocher à la couche",
    snapall: "Accrocher à toutes les couches"
  },
  steps: {
    help: {
      select_elements: "Sélectionner les entités",
      select_element: "Sélectionner une entité",
      copy: "Créer une copie des entités sélectionnées",
      merge: "Fusionner les entités",
      split: "Découper l'entité",
      new: "Créer une nouvelle entité",
      edit_table: "Modifier les entités de la table",
      draw_new_feature: "Dessiner une entité sur la carte",
      action_confirm: "Confirmer l'action",
      double_click_delete: "Sélectionner l'entité à supprimer",
      edit_feature_vertex: "Mettre à jour la forme de l'entité sélectionnée",
      move: "Déplacer l'entité sélectionnée",
      select_feature_to_relation: "Sélectionner l'entité que vous souhaitez mettre en relation",
      show_edit_feature_form:  "Afficher le formulaire de l'entité permettant de modifier les attributs",
      pick_feature: "Sélectionner l'élément de la carte à modifier",
      insert_attributes_feature: "Insérer les attributs de l'entité"
    }
  },
  workflow: {
    steps: {
      select: 'Cliquer sur l\'entité à sélectionner',
      draw_part: "Dessiner la nouvelle partie",
      draw_geometry : "Dessiner la géométrie",
      merge: 'Sélectionner la fonction à introduire en fondu',
      selectPoint: "Cliquer sur l'entité pour la sélectionner",
      selectSHIFT: 'Sélectionner des entités en maintenant la touche SHIFT enfoncée',
      selectDrawBox: "Sélectionner les entités en dessinant un rectangle par la création des deux points de la diagonale",
      selectDrawBoxAtLeast2Feature: "Sélectionner au moins 2 entités en dessinant un rectangle par la création des deux points de la diagonale",
      selectPointSHIFT: 'Sélectionner des caractéristiques en maintenant la touche SHIFT enfoncée (multi-sélection) ou en cliquant sur une seule caractéristique',
      selectMultiPointSHIFT: 'Sélectionner des entités en maintenant la touche SHIFT appuyée ou en cliquant sur l\'entité individuelle',
      selectMultiPointSHIFTAtLeast2Feature: 'Sélectionner au moins 2 entités en maintenant la touche SHIFT appuyée ou en cliquant sur l\'entité individuelle',
      copyCTRL: 'Copier les entités sélectionnées avec CTRL+C',
      selectStartVertex: 'Sélectionner le sommet de départ des entités choisies',
      selectToPaste: 'Sélectionner le point où les entités sélectionnées seront collées',
      draw_split_line: "Tracer une ligne pour couper l'entité sélectionnée"
    },
    title: {
      steps: 'Étapes'
    },
    next: 'Suivant',
  },
  messages: {
    featureslockbyotheruser: "Certaines entités ne sont pas modifiables car elles ont été modifiées par un autre utilisateur",
    featurelockbyotheruser: "L'entité n'est pas modifiable car elle a été modifiée par un autre utilisateur",
    splitted: "entité(s) divisé(es)",
    nosplittedfeature: "La (les) entité(s) n’a (n'ont) pas été divisé(es)",
    press_esc: "Appuyez sur ESC pour revenir",
    online: "Vous êtes à nouveau EN LIGNE. Vous pouvez enregistrer les modifications de façon permanente",
    offline: "Vous êtes HORS LIGNE. Toutes les modifications seront enregistrées temporairement en local",
    delete_feature: "Voulez-vous supprimer l'entité sélectionnée ?",
    delete_feature_relations: "La suppression d'une entité avec des relations associées laissera ces relations orphelines. Il est recommandé de gérer ces relations avant de supprimer l'entité",
    unlink_relation: "Voulez-vous détacher la relation ?",
    commit_feature: "Synthèse des changements",
    toolbox_has_relation: "cette couche fait partie d'une relation",
    saved: "Les données ont été enregistrées correctement",
    saved_local: "Les données ont été correctement sauvegardées localement",
    loading_data: "Chargement des données",
    saving: "Sauvegarde des données. Veuillez patienter...",
    constraints: {
      enable_editing: "Augmenter le niveau de zoom pour permettre l'édition \nEchelle de déclenchement 1 :"
    },
    pdf: "Aperçu du document non disponible. Cliquez ici ",
    commit: {
      header: "La liste ci-dessous montre toutes les modifications qui seront enregistrées.",
      header_relation: "Relation",
      header_add: "<b>Ajouts</b> indique le nombre de entités ajoutées",
      header_update_delete: "<b>Modifié</b> e <b>Supprimé</b> liste les identifiants",
      add: "Ajouté",
      delete: "Supprimé",
      update: "Modifié"
    },
    loading_table_data: "Construction en cours de la table. Veuillez patienter...",
    copy_and_paste_from_other_layer_mandatory_fields: "Avant d'enregistrer, il est nécessaire de remplir tous les champs obligatoires de l'entité",
    no_feature_selected: "Aucune entité sélectionnée",
    select_min_2_features: 'Sélectionner au moins 2 entités'
  },
  relation: {
    table: {
      info: `<div>Sélectionner les relations pour les associer à l'élément en cours d'édition.</div>`
    },
    draw_new_feature:"Dessiner une nouvelle entité",
    draw_or_copy:"ou",
    copy_feature_from_other_layer:"Copier l'entité depuis une autre couche"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Retour à l'entité parente",
        add_relation: "Créer et ajouter une nouvelle relation",
        link_relation: "Associer une relation existante à cette entité",
        open_relation_tools: "Afficher l'outil de relations",
        unlink_relation: "Dissocier la relation"
      }
    },
    buttons: {
      save: "Insérer/Modifier",
      save_and_back: "Sauvegarder et retourner à l'entité parente",
      save_and_back_table: "Sauvegarder et revenir en arrière",
      cancel: "Ignorer les modifications"
    }
  },
  modal: {
    tools: {
      copyfeaturefromotherlayer: {
        title: "Sélectionner la couche",
        edit_attributes: "Mettre à jour en mode multiple les attributs des entités copiées"
      },
      copyfeaturefromprojectlayer: {
        title: "Sélectionner une entité"
      }
    }
  }
}