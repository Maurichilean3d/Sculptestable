import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._main = ctrlGui._main;
    this._menu = null;

    // Configuración: 3 Niveles de anidación para crear patrones complejos
    // count: Cantidad total (1 = desactivado)
    this._configs = [
      // Nivel 1: Patrón Base (ej. Línea en X)
      { count: 3, offset: [2.0, 0.0, 0.0], rotate: [0, 0, 0], scale: [1, 1, 1] },
      // Nivel 2: Multiplicador (ej. Filas en Y)
      { count: 1, offset: [0.0, 2.0, 0.0], rotate: [0, 0, 0], scale: [1, 1, 1] },
      // Nivel 3: Multiplicador (ej. Altura en Z)
      { count: 1, offset: [0.0, 0.0, 2.0], rotate: [0, 0, 0], scale: [1, 1, 1] }
    ];

    // 0 = Local (Relativo al objeto), 1 = World (Global 0,0,0)
    this._referenceMode = 0; 

    this._isPatternOperationInProgress = false;
    this.init(guiParent);
  }

  init(guiParent) {
    if (this._menu) this._menu.remove();

    var menu = this._menu = guiParent.addMenu(TR('sceneCopyPattern')); // "Pattern"

    // --- Configuración Global ---
    menu.addTitle('Settings');
    menu.addCombobox('Origin', this._referenceMode, this.onReferenceChange.bind(this), { 
      'Local (Object Axis)': 0, 
      'World (Global 0,0,0)': 1 
    });

    // --- Generar UI para los 3 Niveles ---
    // Nivel 1
    this.addStageUI(menu, 0, 'Level 1 (Main Pattern)');
    
    // Nivel 2 (Separador visual)
    this.addStageUI(menu, 1, 'Level 2 (Grid / Array)');
    
    // Nivel 3
    this.addStageUI(menu, 2, 'Level 3 (Volume / Stack)');

    // --- Botón de Acción ---
    menu.addTitle('Generate');
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyPattern');
  }

  addStageUI(menu, index, title) {
    var config = this._configs[index];
    
    menu.addTitle(title);
    
    // Count (Cantidad)
    menu.addSlider('Count', config.count, (val) => { config.count = val; }, 1, 20, 1);

    // Offset (Distancia) - Rango pequeño para precisión (-5 a 5)
    menu.addSlider('Offset X', config.offset[0], (val) => { config.offset[0] = val; }, -5, 5, 0.01);
    menu.addSlider('Offset Y', config.offset[1], (val) => { config.offset[1] = val; }, -5, 5, 0.01);
    menu.addSlider('Offset Z', config.offset[2], (val) => { config.offset[2] = val; }, -5, 5, 0.01);

    // Rotate (Rotación)
    menu.addSlider('Rot X', config.rotate[0], (val) => { config.rotate[0] = val; }, -180, 180, 1);
    menu.addSlider('Rot Y', config.rotate[1], (val) => { config.rotate[1] = val; }, -180, 180, 1);
    menu.addSlider('Rot Z', config.rotate[2], (val) => { config.rotate[2] = val; }, -180, 180, 1);
  }

  onReferenceChange(val) {
    this._referenceMode = parseInt(val, 10);
  }

  applyPattern() {
    if (this._isPatternOperationInProgress) return;

    var selection = this._main.getSelectedMeshes();
    if (!selection.length) {
      window.alert('Please select a mesh to duplicate.');
      return;
    }

    // Validación simple
    if (this._configs[0].count === 1 && this._configs[1].count === 1 && this._configs[2].count === 1) {
      window.alert('All counts are set to 1. Increase "Count" in Level 1 to create copies.');
      return;
    }

    this._isPatternOperationInProgress = true;

    try {
      this._main.createPattern(
        this._configs, 
        this._referenceMode === 1 // true = World, false = Local
      );
    } catch (e) {
      console.error(e);
      window.alert('Error generating pattern.');
    } finally {
      this._isPatternOperationInProgress = false;
    }
  }
}

export default GuiPattern;
