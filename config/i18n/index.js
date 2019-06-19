export default {
  it: {
    search: "Cerca",
    editing_data: "Editing Dati",
    editing_attributes: "Edita attributi",
    relations: "Relazioni",
    edit_relation: "Edita relazione",
    back_to_relations: "Ritorna alle Relazioni",
    no_relations_found: "Non ci sono relazioni",
    relation_data: "Dati relativi alla relazione",
    relation_already_added : "Relazione già presente",
    list_of_relations_feature: "Elenco Relazioni della feature ",
    tools: {
      add_feature: "Aggiungi feature",
      delete_feature: "Elimina feature",
      move_feature: "Muovi feature",
      update_vertex: "Aggiorna vertici feature",
      update_feature: "Modifica feature"
    },
    steps: {
      help: {
        new: "Creo una nuova feature",
        edit_table: "Edita le features della tabella",
        draw_new_feature: "Disegna sulla mappa la feature",
        action_confirm: "Conferma azione",
        double_click_delete: "Doppio Click sulla feature che vuoi cancellare",
        edit_feature_vertex: "Modifica o aggiungi un vertice alla feature selezionata",
        move: "Muovi la feature selezionata",
        select_feature_to_relation: "Seleziona la feature che vuoi mettere in relazione",
        show_edit_feature_form:  "Mostra il form della feature per poter editare gli attributi",
        pick_feature: "Clicca su una feature per poterla modificare",
        insert_attributes_feature: "Inserisci gli attributi della feature"
      }
    },
    messages: {
      delete_feature: "Vuoi eliminare l'elemento selezionato?",
      commit_feature: "Vuoi salvare definitivamente le modifiche",
      change_toolbox_relation: "Layer in relazione. Prima di passare ad altri editing è obbligatorio salvare le modifiche correnti.",
      saved: "I dati sono stati salvati correttamente",
      loading_data: "Caricamento dati",
      saving: "Salvataggio dati in corso. Attendere ...",
      commit: {
        header: "La lista sotto riporta tutte le modifiche che verranno salvate.",
        header_add: "<b>Aggiunte</b> riporta il numero delle features aggiunte",
        header_update_delete: "<b>Modificate</b> e <b>Cancellate</b> riporta la lista degli id",
        add: "Aggiunte (n. features)",
        delete: "Cancellate(id)",
        update: "Modificate(id)"
      }
    },
    relation: {
      table: {
        info: `
                  <div>
                    Questa è la lista delle relazioni orfane o associate ad altre geometrie.
                    Clicca sulla singola relazione per associarla alla geometria in editing.
                  </div>
                  <div>
                    <span style="font-weight: bold">
                      ATTENZIONE
                    </span>: nel caso in cui la relazione sia attualmente associata ad un'altra geometria, verrà dissociata da questa
                  </div>
                `
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Crea ed aggiungi nuova relazione",
          link_relation: "Associa una relazione esistente a questa feature",
          open_relation_tools: "Apri strumenti relatione",
          unlink_relation: "Annulla relazione"
        }
      },
      buttons: {
        save: "Salva",
        cancel: "Cancella"
      }
    }

  },
  en: {
    search: "Search",
    editing_data: "Editing Layers",
    editing_attributes: "Editing attributes",
    relations: "Relations",
    edit_relation: "Edit relation",
    back_to_relations: "Back to Relations",
    no_relations_found: "No relations found",
    relation_data: "Relation data",
    relation_already_added: "Relation already added",
    list_of_relations_feature: "List of relations feature ",
    tools: {
      add_feature: "Add feature",
      delete_feature: "Delete feature",
      move_feature: "Move feature",
      update_vertex: "Update feature vertex",
      update_feature: "Update feature"
    },
    steps: {
      help: {
        new: "Create new feature",
        edit_table: "Edit table features",
        draw_new_feature: "Draw feature on map",
        action_confirm: "Confirm action",
        double_click_delete: "Double Click on the feature to delete",
        edit_feature_vertex: "Modify or add a vertex on selected feature",
        move: "Move selected feature",
        select_feature_to_relation: "Select feature that you bind relation",
        show_edit_feature_form:  "Show feature form to edit attributes",
        pick_feature: "Click on feature to modify",
        insert_attributes_feature: "Insert attributes of the feature"
      }
    },
    messages: {
      delete_feature: "Do you want delete selected feature ?",
      commit_feature: "Do you want to save the changes",
      change_toolbox_relation: "Layer has relation/relations. Before switch editing you need to save changes done.",
      saved: "Data saved successfully",
      loading_data: "Loading data",
      saving: "Saving data. Please wait ...",
      pdf: "Document preview not available. Please click here ",
      commit: {
        header: "The following list show all changes to commit.",
        header_add: "<b>Added</b> show the number of features added",
        header_update_delete: "<b>Modified</b> and <b>Deleted</b> show the list of feautes id",
        add: "Added(n. features)",
        delete: "Deleted(id)",
        update: "Modified(id)"
      }
    },
    relation: {
      table: {
        info: `
                  <div>
                    This is a list of orphan or binded relations to other features.
                    Click on single relation to link it to current editing feature.
                  </div>
                  <div>
                    <span style="font-weight: bold">
                      ATTENTION
                    </span>: in case of this relation is already bind to another, the previous link is lost
                  </div>
                `
      }
    },
    form: {
      relations: {
        tooltips: {
          add_relation: "Create and link new relation",
          link_relation: "Join a relation to this feature",
          open_relation_tools: "Show relation tools",
          unlink_relation: "Unlink relation"
        }
      },
      buttons: {
        save: "Save",
        cancel: "Cancel"
      }
    },
  }
}
