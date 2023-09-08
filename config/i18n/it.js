export default {
  errors: {
    no_layers: "Si è verificato un errore nel caricamento dei layers in editing.",
    some_layers: "Si è verificato un errore nel caricamento di alcuni layers in editing"
  },
  search: "Cerca",
  editing_changes: "Modifiche Editing",
  editing_data: "Edita Dati",
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
  toolbox: {
    title: 'Edita'
  },
  table: {
    edit: "Edita feature",
    copy: "Crea una copia",
    delete: "Cancella feature"
  },
  tools: {
    copy: "Copia features",
    pastefeaturesfromotherlayers: "Copia features da altro layer",
    addpart: "Aggiungi parte alla geometria",
    deletepart: "Cancella parte dalla geometria",
    merge: "Dissolvi features",
    split: "Taglia Feature",
    add_feature: "Aggiungi feature",
    delete_feature: "Elimina feature",
    move_feature: "Muovi feature",
    update_vertex: "Aggiorna vertici feature",
    update_feature: "Modifica attributi feature",
    update_multi_features: "Modifica gli attributi delle features selezionate",
    copyfeaturefromexternallayer: "Crea feature dal layer aggiunto"
  },
  toolsoftool: {
    measure: "Visualizza misura",
    snap: "Snap sul layer",
    snapall: "Snap su tutti i layer"
  },
  steps: {
    help: {
      select_elements: "Seleziona le features",
      select_element: "Seleziona la feature",
      copy: "Crea una copia delle feature selezionate",
      merge: "Dissolvi features",
      split: "Taglia Feature",
      new: "Creo una nuova feature",
      edit_table: "Edita le features della tabella",
      draw_new_feature: "Disegna sulla mappa la feature",
      action_confirm: "Conferma azione",
      double_click_delete: "Seleziona la feature sulla mappa da cancellare",
      edit_feature_vertex: "Modifica o aggiungi un vertice alla feature selezionata",
      move: "Muovi la feature selezionata",
      select_feature_to_relation: "Seleziona la feature che vuoi mettere in relazione",
      show_edit_feature_form:  "Mostra il form della feature per poter editare gli attributi",
      pick_feature: "Seleziona la feature sulla mappa da modificare",
      insert_attributes_feature: "Inserisci gli attributi della feature"
    }
  },
  workflow: {
    steps: {
      select: 'Clicca sulla feature da selezionare',
      draw_part: "Disegna la nuova parte",
      merge: 'Seleziona la feature su cui dissolvere',
      selectPoint: "Clicca sulla feature per selezionarla",
      selectSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT',
      selectDrawBox: "Seleziona le features disegnando un rettangolo mediante la creazione dei due punti della diagonale",
      selectDrawBoxAtLeast2Feature: "Seleziona almeno 2 features disegnando un rettangolo mediante la creazione dei due punti della diagonale",
      selectPointSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT (multiselezione) oppure cliccando sulla singola feature',
      selectMultiPointSHIFT: 'Seleziona le features tenedo premuto il tasto SHIFT oppure cliccando sulla singola feature',
      selectMultiPointSHIFTAtLeast2Feature: 'Seleziona almeno 2 features tenedo premuto il tasto SHIFT oppure cliccando sulla singola feature',
      copyCTRL: 'Copia le features selezionate con CTRL+C',
      selectStartVertex: 'Seleziona il vertice di partenza delle feature selezionate',
      selectToPaste: 'Seleziona il punto dove verranno incollate le features selezionate',
      draw_split_line: "Disegna una linea per tagliare la feature selezionata"
    }
  },
  messages: {
    featureslockbyotheruser: "Ci sono alcune geometrie/records non editabili perchè in modifica da altri utenti",
    splitted: "Feature(s) splittata(e)",
    nosplittedfeature: "La(e) feature(s) non è stata splittata",
    press_esc: "Premi ESC per tornare indietro",
    online: "Ora sei di nuovo ONLINE. Puoi slavare le modifiche in modo permanente",
    offline: "Sei OFFLINE. Tutte le modifiche saranno salvate temporaneamente in locale",
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
    pdf: "Anteprima del documento non disponibile. Clicca qui ",
    commit: {
      header: "La lista sotto riporta tutte le modifiche che verranno salvate.",
      header_add: "<b>Aggiunte</b> riporta il numero delle features aggiunte",
      header_update_delete: "<b>Modificate</b> e <b>Cancellate</b> riporta la lista degli id",
      add: "Aggiunte (n. features)",
      delete: "Cancellate(id)",
      update: "Modificate(id)"
    },
    loading_table_data: "Costruzione tabella dati in corso. Attendere ...",
    copy_and_paste_from_other_layer_mandatory_fields: "Necessario compilare eventuali campi obbligatori sulle features incollate prima del salvataggio",
    no_feature_selected: "Nessuna feature selezionata",
    select_min_2_features: 'Seleziona come minimo due features'
  },
  relation: {
    table: {
      info: `<div>Seleziona le relazioni per associarle alla feature in editing.</div>`
    },
    draw_new_feature: "Disegna nuova geometria",
    draw_or_copy: "oppure",
    copy_feature_from_other_layer: "Copia geometria da altro layer"
  },
  form: {
    relations: {
      tooltips: {
        back_to_father:"Torna ad editare il padre",
        add_relation: "Crea ed aggiungi nuova relazione",
        link_relation: "Associa una relazione esistente a questa feature",
        open_relation_tools: "Apri strumenti relatione",
        unlink_relation: "Annulla relazione"
      }
    },
    buttons: {
      save: "Inserisci/Modifica",
      save_table: 'Modifica',
      save_and_back: "Salva e torna al padre",
      save_and_back_table: "Salva e torna indietro",
      cancel: "Ignora Modifiche"
    }
  },
  modal: {
    tools: {
      copyfeaturefromotherlayer: {
        title: "Seleziona feature/s"
      },
      copyfeaturefromprojectlayer: {
        title: "Seleziona una feature"
      }
    }
  }
}