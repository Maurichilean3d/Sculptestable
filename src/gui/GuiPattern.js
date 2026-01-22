import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._guiParent = guiParent; 
    this._main = ctrlGui._main;
    this._menu = null;

    // Estado inicial
    this._mode = 'LINEAR'; // Modos: LINEAR o GRID
    this._origin = 'LOCAL'; // Pivote: LOCAL o WORLD

    // --- AJUSTE UI: Valores iniciales más útiles ---
    this._linCount = 3;
    this._linOffset = [2.0, 0.0, 0.0]; // Separación visible para meshes típicos
    this._linRotate = [0.0, 0.0, 0.0];
    this._linScale = [1.0, 1.0, 1.0];

    // Grid con valores iniciales visibles (2x2x1 = 4 copias)
    this._gridCount = [2, 2, 1];
    this._gridSpace = [2.0, 2.0, 2.0];

    this._isOperation = false;
    this.init();
  }

  init() {
    if (this._menu) this._menu.remove();

    var menu = this._menu = this._guiParent.addMenu(TR('sceneCopyPattern'));

    // --- 1. CONFIGURACIÓN ---
    menu.addTitle('Settings');
    
    menu.addCombobox('Type', this._mode, this.onModeChange.bind(this), {
      'Linear (Line/Circle)': 'LINEAR',
      'Grid (Array 3D)': 'GRID'
    });

    menu.addCombobox('Reference', this._origin, this.onOriginChange.bind(this), {
      'Local (Selection Axis)': 'LOCAL',
      'World (Global 0,0,0)': 'WORLD'
    });

    // --- 2. PARÁMETROS (RANGOS MEJORADOS) ---
    if (this._mode === 'LINEAR') {
      this.buildLinearUI(menu);
    } else {
      this.buildGridUI(menu);
    }

    // --- 3. ACCIÓN ---
    menu.addTitle('Generate');
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyPattern');
  }

  buildLinearUI(menu) {
    menu.addTitle('Repetitions');
    menu.addSlider('Count (Total)', this._linCount, (v) => { this._linCount = v; }, 1, 50, 1);

    // MEJORA UI: Rango aumentado a +/- 50.0 para mallas grandes
    menu.addTitle('Offset per Copy');
    menu.addSlider('Offset X', this._linOffset[0], (v) => { this._linOffset[0] = v; }, -50.0, 50.0, 0.1);
    menu.addSlider('Offset Y', this._linOffset[1], (v) => { this._linOffset[1] = v; }, -50.0, 50.0, 0.1);
    menu.addSlider('Offset Z', this._linOffset[2], (v) => { this._linOffset[2] = v; }, -50.0, 50.0, 0.1);

    menu.addTitle('Rotation per Copy (°)');
    menu.addSlider('Rotate X', this._linRotate[0], (v) => { this._linRotate[0] = v; }, -180, 180, 1);
    menu.addSlider('Rotate Y', this._linRotate[1], (v) => { this._linRotate[1] = v; }, -180, 180, 1);
    menu.addSlider('Rotate Z', this._linRotate[2], (v) => { this._linRotate[2] = v; }, -180, 180, 1);

    menu.addTitle('Scale per Copy');
    menu.addSlider('Uniform Scale', this._linScale[0], (v) => {
        this._linScale = [v, v, v];
    }, 0.1, 3.0, 0.01); // Rango razonable para escalado
  }

  buildGridUI(menu) {
    menu.addTitle('Grid Layout');

    // MEJORA UI: Rangos aumentados para el Grid también
    // Eje X (Columnas)
    menu.addSlider('Columns (X axis)', this._gridCount[0], (v) => { this._gridCount[0] = v; }, 1, 20, 1);
    menu.addSlider('Spacing X', this._gridSpace[0], (v) => { this._gridSpace[0] = v; }, -50.0, 50.0, 0.1);

    // Eje Y (Filas)
    menu.addSlider('Rows (Y axis)', this._gridCount[1], (v) => { this._gridCount[1] = v; }, 1, 20, 1);
    menu.addSlider('Spacing Y', this._gridSpace[1], (v) => { this._gridSpace[1] = v; }, -50.0, 50.0, 0.1);

    // Eje Z (Niveles)
    menu.addSlider('Levels (Z axis)', this._gridCount[2], (v) => { this._gridCount[2] = v; }, 1, 20, 1);
    menu.addSlider('Spacing Z', this._gridSpace[2], (v) => { this._gridSpace[2] = v; }, -50.0, 50.0, 0.1);
  }

  onModeChange(val) {
    this._mode = val;
    this.init(); 
  }

  onOriginChange(val) {
    this._origin = val;
  }

  applyPattern() {
    if (this._isOperation) return;

    var selection = this._main.getSelectedMeshes();
    if (!selection.length) {
      window.alert('Please select a mesh first.');
      return;
    }

    this._isOperation = true;

    var configs = [];

    if (this._mode === 'LINEAR') {
      configs.push({
        count: this._linCount,
        offset: this._linOffset,
        rotate: this._linRotate,
        scale: this._linScale
      });
    } else {
      if (this._gridCount[0] > 1)
        configs.push({ count: this._gridCount[0], offset: [this._gridSpace[0], 0, 0], rotate: [0,0,0], scale: [1,1,1] });
      if (this._gridCount[1] > 1)
        configs.push({ count: this._gridCount[1], offset: [0, this._gridSpace[1], 0], rotate: [0,0,0], scale: [1,1,1] });
      if (this._gridCount[2] > 1)
        configs.push({ count: this._gridCount[2], offset: [0, 0, this._gridSpace[2]], rotate: [0,0,0], scale: [1,1,1] });
    }

    // Validar que hay configuraciones válidas
    if (configs.length === 0) {
      window.alert('Pattern configuration is empty. Please adjust count values.');
      this._isOperation = false;
      return;
    }

    try {
      this._main.createPattern(configs, this._origin === 'WORLD');
    } catch (e) {
      console.error(e);
      window.alert('Error creating pattern: ' + e.message);
    } finally {
      this._isOperation = false;
    }
  }
}

export default GuiPattern;
