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
    tooltip:{
      edit_layer: "Modifica Layer"
    },
    tools: {
      copy: "Crea una copia delle feature selezionate",
      merge: "Dissolvi features",
      split: "Taglia Feature",
      add_feature: "Aggiungi feature",
      delete_feature: "Elimina feature",
      move_feature: "Muovi feature",
      update_vertex: "Aggiorna vertici feature",
      update_feature: "Modifica feature"
    },
    steps: {
      help: {
        copy: "Crea una copia delle feature selezionate",
        merge: "Dissolvi features",
        split: "Taglia Feature",
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
    workflow: {
      steps: {
        selectSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT',
        copyCTRL: 'Copia le features selezionate con CTRL+C',
        selectStartVertex: 'Seleziona il vertice di partenza delle feature selezionate',
        selectVertexToPaste: 'Seleziona il vertice dove verranno incollate le features selezionate'
      }
    },
    messages: {
      online: "Ora sei di nuovo ONLINE. Puoi slavare le modifiche in modo permanente",
      offline: "Sei OFFLINE. Tutte le modifiche saranno salvate temporaneamente in locale",
      press_esc: "Premi ESC per tornare indietro",
      delete_feature: "Vuoi eliminare l'elemento selezionato?",
      delete_feature_relations: "Cancellando una feature con relazioni associate, tale relazioni rimarranno orfane. Si consiglia di gestire tali relazioni prima di cancellare la feature",
      unlink_relation: "Vuoi staccare la relazione?",
      commit_feature: "Vuoi salvare definitivamente le modifiche",
      change_toolbox_relation: "Layer in relazione. Prima di passare ad altri editing è obbligatorio salvare le modifiche correnti.",
      saved: "I dati sono stati salvati correttamente",
      saved_local: "I dati sono stati salvati correttamente in locale",
      loading_data: "Caricamento dati",
      saving: "Salvataggio dati in corso. Attendere ...",
      constraints: {
        enable_editing: "Aumentare il livello di zoom per abilitare l'editing \nScala di attivazione 1:"
      },
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
                    Seleziona le relaioni per associarle alla feature in editing.
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
    tooltip: {
      edit_layer: "Edit Layer"
    },
    tools: {
      copy: "Create new copy of selected features",
      merge: "Dissolve features",
      split: "Split Feature",
      add_feature: "Add feature",
      delete_feature: "Delete feature",
      move_feature: "Move feature",
      update_vertex: "Update feature vertex",
      update_feature: "Update feature"
    },
    steps: {
      help: {
        copy: "Create new copy of selected features",
        merge: "Dissolve features",
        split: "Split Feature",
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
    workflow: {
      steps: {
        selectSHIFT: 'Select features drawing a rectangle pressing SHIFT',
        copyCTRL: 'Copy selected features using CTRL+C',
        selectStartVertex: 'Select starting vertex of selected features',
        selectVertexToPaste: 'Select vertex where paste the features selected'
      }
    },
    messages: {
      press_esc: "Press ESC to back",
      online: "Back ONLINE. Now you can save your changes on database",
      offline: "You are OFFLINE. All changes are saved locally",
      delete_feature: "Do you want delete selected feature ?",
      delete_feature_relations: "If feature has bindings relations, these relations become orphans. We suggest to handle these relations before detele this feature",
      unlink_relation: "Do you want unlink relation?",
      commit_feature: "Do you want to save the changes",
      change_toolbox_relation: "Layer has relation/relations. Before switch editing you need to save changes done.",
      saved: "Data saved successfully",
      saved_local:"Data saved locally successfully",
      loading_data: "Loading data",
      saving: "Saving data. Please wait ...",
      constraints: {
        enable_editing: "Please Zoom In to enable editing tools \nActivation scale at 1:"
      },
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
                    Select relations to link it to current editing feature.
                  </div>
                  <div>
               
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
