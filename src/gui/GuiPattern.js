import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._guiParent = guiParent; 
    this._main = ctrlGui._main;
    this._menu = null;

    // Estado inicial
    this._mode = 'LINEAR'; // Modos: LINEAR o GRID
    this._origin = 'LOCAL'; 

    // Valores iniciales
    this._linCount = 3;
    this._linOffset = [2.0, 0.0, 0.0]; 
    this._linRotate = [0.0, 0.0, 0.0];
    this._linScale = [1.0, 1.0, 1.0];

    // Grid con valores iniciales
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
      LINEAR: 'Linear (Line/Circle)',
      GRID: 'Grid (Per Axis)'
    });

    menu.addCombobox('Reference', this._origin, this.onOriginChange.bind(this), {
      LOCAL: 'Default'
    });

    // --- 2. PARÁMETROS ---
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
    menu.addSlider('Count (Total)', this._linCount, (v) => { this._linCount = v; }, 2, 50, 1);

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
    }, 0.1, 3.0, 0.01); 
  }

  buildGridUI(menu) {
    menu.addTitle('Grid Layout (Axis Independent)');

    // Eje X
    menu.addSlider('Columns (X)', this._gridCount[0], (v) => { this._gridCount[0] = v; }, 1, 20, 1);
    menu.addSlider('Spacing X', this._gridSpace[0], (v) => { this._gridSpace[0] = v; }, -50.0, 50.0, 0.1);

    // Eje Y
    menu.addSlider('Rows (Y)', this._gridCount[1], (v) => { this._gridCount[1] = v; }, 1, 20, 1);
    menu.addSlider('Spacing Y', this._gridSpace[1], (v) => { this._gridSpace[1] = v; }, -50.0, 50.0, 0.1);

    // Eje Z
    menu.addSlider('Levels (Z)', this._gridCount[2], (v) => { this._gridCount[2] = v; }, 1, 20, 1);
    menu.addSlider('Spacing Z', this._gridSpace[2], (v) => { this._gridSpace[2] = v; }, -50.0, 50.0, 0.1);
  }

  onModeChange(val) {
    if (val === this._mode) return;
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

    // Validación de la malla seleccionada
    var mesh = this._main.getMesh();
    if (!mesh || !mesh.getVertices() || mesh.getVertices().length === 0) {
      window.alert('The selected mesh is invalid or empty.');
      return;
    }

    this._isOperation = true;

    try {
      if (this._mode === 'LINEAR') {
        // Linear Mode
        var copies = Math.max(0, this._linCount - 1);
        if (copies > 0) {
          // Validar parámetros antes de llamar
          if (!this._linOffset || !this._linRotate || !this._linScale) {
            throw new Error('Invalid pattern parameters');
          }

          var result = this._main.duplicateSelectionGeneric(
            copies,
            this._linOffset,
            this._linRotate,
            this._linScale,
            true
          );

          // duplicateSelectionGeneric returns undefined if it fails validation
          if (result === undefined) {
            // Validation failed - alert was already shown by duplicateSelectionGeneric
            this._isOperation = false;
            return;
          }

          if (!result || result.length === 0) {
            throw new Error('Failed to create pattern copies');
          }
        } else {
          window.alert('Count must be at least 2 to create a pattern.');
          this._isOperation = false;
          return;
        }

      } else {
        // Grid Mode: Multiplica ejes X -> Y -> Z

        // Eje X (Añade a selección actual)
        var countX = Math.max(0, this._gridCount[0] - 1);
        if (countX > 0) {
           var resultX = this._main.duplicateSelectionGeneric(countX, [this._gridSpace[0], 0, 0], [0,0,0], [1,1,1], true);
           if (resultX === undefined) {
             this._isOperation = false;
             return;
           }
        }

        // Eje Y (Duplica todo lo anterior en Y)
        var countY = Math.max(0, this._gridCount[1] - 1);
        if (countY > 0) {
           var resultY = this._main.duplicateSelectionGeneric(countY, [0, this._gridSpace[1], 0], [0,0,0], [1,1,1], true);
           if (resultY === undefined) {
             this._isOperation = false;
             return;
           }
        }

        // Eje Z (Duplica todo lo anterior en Z)
        var countZ = Math.max(0, this._gridCount[2] - 1);
        if (countZ > 0) {
           var resultZ = this._main.duplicateSelectionGeneric(countZ, [0, 0, this._gridSpace[2]], [0,0,0], [1,1,1], true);
           if (resultZ === undefined) {
             this._isOperation = false;
             return;
           }
        }

        if (countX === 0 && countY === 0 && countZ === 0) {
          window.alert('At least one axis must have more than 1 copy.');
          this._isOperation = false;
          return;
        }
      }

      this._main.render();
      console.log('Pattern created successfully');

    } catch (e) {
      console.error('Pattern error:', e);
      window.alert('Error creating pattern: ' + (e.message || 'Unknown error'));
    } finally {
      this._isOperation = false;
    }
  }
}

export default GuiPattern;
