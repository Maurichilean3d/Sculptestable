import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._guiParent = guiParent; 
    this._main = ctrlGui._main;
    this._menu = null;

    // Estado inicial simple
    this._mode = 'LINEAR'; // Modos: LINEAR o GRID
    this._origin = 'LOCAL'; // Pivote: LOCAL o WORLD

    // Parámetros Lineales (Filas, columnas, círculos)
    this._linCount = 3;
    this._linOffset = [2.0, 0.0, 0.0];
    this._linRotate = [0.0, 0.0, 0.0];
    this._linScale = [1.0, 1.0, 1.0];

    // Parámetros Grid (Suelos, Muros 3D)
    this._gridCount = [3, 3, 1]; // Columnas, Filas, Pisos
    this._gridSpace = [2.0, 2.0, 2.0]; // Espaciado X, Y, Z

    this._isOperation = false;
    this.init();
  }

  init() {
    // Si el menú ya existe, lo borramos para redibujarlo limpio
    if (this._menu) this._menu.remove();

    var menu = this._menu = this._guiParent.addMenu(TR('sceneCopyPattern'));

    // --- 1. CONFIGURACIÓN PRINCIPAL ---
    menu.addTitle('General');
    
    // Selector de Modo: Limpia la UI mostrando solo lo necesario
    menu.addCombobox('Mode', this._mode, this.onModeChange.bind(this), {
      'Linear / Radial': 'LINEAR',
      'Grid / Array (2D/3D)': 'GRID'
    });

    // Selector de Pivote: Define cómo giran o se mueven las copias
    menu.addCombobox('Origin', this._origin, this.onOriginChange.bind(this), {
      'Selection (Object Axis)': 'LOCAL',
      'World Center (0,0,0)': 'WORLD'
    });

    // --- 2. PARÁMETROS DINÁMICOS ---
    if (this._mode === 'LINEAR') {
      this.buildLinearUI(menu);
    } else {
      this.buildGridUI(menu);
    }

    // --- 3. BOTÓN DE ACCIÓN ---
    menu.addTitle('Action');
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyPattern');
  }

  buildLinearUI(menu) {
    menu.addTitle('Linear Parameters');
    menu.addSlider('Count', this._linCount, (v) => { this._linCount = v; }, 1, 50, 1);

    menu.addTitle('Offset (Distance)');
    menu.addSlider('X', this._linOffset[0], (v) => { this._linOffset[0] = v; }, -10, 10, 0.01);
    menu.addSlider('Y', this._linOffset[1], (v) => { this._linOffset[1] = v; }, -10, 10, 0.01);
    menu.addSlider('Z', this._linOffset[2], (v) => { this._linOffset[2] = v; }, -10, 10, 0.01);

    menu.addTitle('Rotation (Degrees)');
    menu.addSlider('Rot X', this._linRotate[0], (v) => { this._linRotate[0] = v; }, -180, 180, 1);
    menu.addSlider('Rot Y', this._linRotate[1], (v) => { this._linRotate[1] = v; }, -180, 180, 1);
    menu.addSlider('Rot Z', this._linRotate[2], (v) => { this._linRotate[2] = v; }, -180, 180, 1);
    
    // Escala uniforme para simplificar
    menu.addTitle('Scale Step');
    menu.addSlider('Uniform Scale', this._linScale[0], (v) => { 
        this._linScale = [v, v, v]; 
    }, 0.1, 2.0, 0.01);
  }

  buildGridUI(menu) {
    menu.addTitle('Grid Configuration');
    
    // Eje X
    menu.addSlider('Columns (X)', this._gridCount[0], (v) => { this._gridCount[0] = v; }, 1, 20, 1);
    menu.addSlider('Space X', this._gridSpace[0], (v) => { this._gridSpace[0] = v; }, -5, 5, 0.01);

    // Eje Y
    menu.addSlider('Rows (Y)', this._gridCount[1], (v) => { this._gridCount[1] = v; }, 1, 20, 1);
    menu.addSlider('Space Y', this._gridSpace[1], (v) => { this._gridSpace[1] = v; }, -5, 5, 0.01);

    // Eje Z
    menu.addSlider('Levels (Z)', this._gridCount[2], (v) => { this._gridCount[2] = v; }, 1, 20, 1);
    menu.addSlider('Space Z', this._gridSpace[2], (v) => { this._gridSpace[2] = v; }, -5, 5, 0.01);
  }

  onModeChange(val) {
    this._mode = val;
    this.init(); // Reconstruye la UI instantáneamente
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
    
    // Preparar configuración para Scene.js
    var configs = [];

    if (this._mode === 'LINEAR') {
      // Configuración Lineal Simple
      configs.push({
        count: this._linCount,
        offset: this._linOffset,
        rotate: this._linRotate,
        scale: this._linScale
      });
    } else {
      // Configuración Grid (X -> Y -> Z)
      if (this._gridCount[0] > 1) // X
        configs.push({ count: this._gridCount[0], offset: [this._gridSpace[0], 0, 0], rotate: [0,0,0], scale: [1,1,1] });
      if (this._gridCount[1] > 1) // Y
        configs.push({ count: this._gridCount[1], offset: [0, this._gridSpace[1], 0], rotate: [0,0,0], scale: [1,1,1] });
      if (this._gridCount[2] > 1) // Z
        configs.push({ count: this._gridCount[2], offset: [0, 0, this._gridSpace[2]], rotate: [0,0,0], scale: [1,1,1] });
    }

    try {
      this._main.createPattern(configs, this._origin === 'WORLD');
    } catch (e) {
      console.error(e);
      window.alert('Error creating pattern.');
    } finally {
      this._isOperation = false;
    }
  }
}

export default GuiPattern;
