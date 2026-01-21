import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._guiParent = guiParent; // Guardamos referencia para reconstruir el menú
    this._main = ctrlGui._main;
    this._menu = null;

    // Estado de la UI
    this._mode = 'LINEAR'; // 'LINEAR' o 'GRID'
    this._origin = 'LOCAL'; // 'LOCAL' o 'WORLD'

    // Parámetros Lineales (y Circulares)
    this._linCount = 3;
    this._linOffset = [2.0, 0.0, 0.0];
    this._linRotate = [0.0, 0.0, 0.0];
    this._linScale = [1.0, 1.0, 1.0];

    // Parámetros Grid (Rejilla)
    this._gridCount = [3, 1, 1]; // X, Y, Z
    this._gridSpace = [2.0, 2.0, 2.0]; // X, Y, Z

    this._isOperation = false;
    
    // Iniciar UI
    this.init();
  }

  init() {
    // 1. Limpieza: Si el menú ya existe, lo eliminamos para redibujar limpio
    if (this._menu) {
      this._menu.remove();
      this._menu = null;
    }

    // 2. Crear Menú Principal
    var menu = this._menu = this._guiParent.addMenu(TR('sceneCopyPattern'));

    // --- SECCIÓN 1: TIPO DE PATRÓN ---
    menu.addTitle('Pattern Type');
    menu.addCombobox('Mode', this._mode, this.onModeChange.bind(this), {
      'Linear / Radial': 'LINEAR',
      'Grid (2D/3D)': 'GRID'
    });

    menu.addCombobox('Pivot', this._origin, this.onOriginChange.bind(this), {
      'Selection (Local)': 'LOCAL',
      'World Center (0,0,0)': 'WORLD'
    });

    // --- SECCIÓN 2: CONTROLES DINÁMICOS ---
    if (this._mode === 'LINEAR') {
      this.buildLinearUI(menu);
    } else {
      this.buildGridUI(menu);
    }

    // --- SECCIÓN 3: ACCIÓN ---
    menu.addTitle('Action');
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyPattern');
  }

  // --- UI Builders ---

  buildLinearUI(menu) {
    menu.addTitle('Linear Parameters');
    
    // Cantidad
    menu.addSlider('Count', this._linCount, (v) => { this._linCount = v; }, 1, 50, 1);

    // Traslación (Espaciado)
    menu.addTitle('Distance (Offset)');
    menu.addSlider('X', this._linOffset[0], (v) => { this._linOffset[0] = v; }, -10, 10, 0.01);
    menu.addSlider('Y', this._linOffset[1], (v) => { this._linOffset[1] = v; }, -10, 10, 0.01);
    menu.addSlider('Z', this._linOffset[2], (v) => { this._linOffset[2] = v; }, -10, 10, 0.01);

    // Rotación
    menu.addTitle('Rotation (Step)');
    menu.addSlider('Rot X', this._linRotate[0], (v) => { this._linRotate[0] = v; }, -180, 180, 1);
    menu.addSlider('Rot Y', this._linRotate[1], (v) => { this._linRotate[1] = v; }, -180, 180, 1);
    menu.addSlider('Rot Z', this._linRotate[2], (v) => { this._linRotate[2] = v; }, -180, 180, 1);

    // Escala
    menu.addTitle('Scale (Step)');
    menu.addSlider('Scale', this._linScale[0], (v) => { 
      this._linScale = [v, v, v]; // Escala uniforme simple
    }, 0.1, 2.0, 0.01);
  }

  buildGridUI(menu) {
    menu.addTitle('Grid Dimensions (X * Y * Z)');
    
    // Columnas (X)
    menu.addSlider('Count X', this._gridCount[0], (v) => { this._gridCount[0] = v; }, 1, 20, 1);
    menu.addSlider('Space X', this._gridSpace[0], (v) => { this._gridSpace[0] = v; }, -10, 10, 0.01);

    // Filas (Y)
    menu.addSlider('Count Y', this._gridCount[1], (v) => { this._gridCount[1] = v; }, 1, 20, 1);
    menu.addSlider('Space Y', this._gridSpace[1], (v) => { this._gridSpace[1] = v; }, -10, 10, 0.01);

    // Altura (Z)
    menu.addSlider('Count Z', this._gridCount[2], (v) => { this._gridCount[2] = v; }, 1, 20, 1);
    menu.addSlider('Space Z', this._gridSpace[2], (v) => { this._gridSpace[2] = v; }, -10, 10, 0.01);
  }

  // --- Eventos ---

  onModeChange(val) {
    this._mode = val;
    this.init(); // Reconstruir menú instantáneamente
  }

  onOriginChange(val) {
    this._origin = val;
  }

  // --- Lógica de Aplicación ---

  applyPattern() {
    if (this._isOperation) return;

    var selection = this._main.getSelectedMeshes();
    if (!selection.length) {
      window.alert('Select a mesh first.');
      return;
    }

    this._isOperation = true;

    // Construir la configuración para Scene.js
    var configs = [];

    if (this._mode === 'LINEAR') {
      // Modo Lineal: Un solo paso complejo
      configs.push({
        count: this._linCount,
        offset: this._linOffset,
        rotate: this._linRotate,
        scale: this._linScale
      });
    } else {
      // Modo Grid: 3 pasos simples (X, luego Y, luego Z)
      // X
      if (this._gridCount[0] > 1) {
        configs.push({ count: this._gridCount[0], offset: [this._gridSpace[0], 0, 0], rotate: [0,0,0], scale: [1,1,1] });
      }
      // Y
      if (this._gridCount[1] > 1) {
        configs.push({ count: this._gridCount[1], offset: [0, this._gridSpace[1], 0], rotate: [0,0,0], scale: [1,1,1] });
      }
      // Z
      if (this._gridCount[2] > 1) {
        configs.push({ count: this._gridCount[2], offset: [0, 0, this._gridSpace[2]], rotate: [0,0,0], scale: [1,1,1] });
      }
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
