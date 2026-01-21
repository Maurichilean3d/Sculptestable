import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._main = ctrlGui._main;
    this._menu = null;
    
    // Unified Parameters
    this._patternCount = 3;
    // AJUSTE: Valor inicial reducido a 2 para evitar que salga disparado al inicio
    this._patternTranslate = [2.0, 0.0, 0.0]; // X, Y, Z
    this._patternRotate = [0, 0, 0];     // X, Y, Z (Degrees)
    this._patternScale = [1, 1, 1];      // X, Y, Z (Not exposed in UI to keep simple, but supported in logic)

    this._isPatternOperationInProgress = false;
    this.init(guiParent);
  }

  init(guiParent) {
    var menu = this._menu = guiParent.addMenu(TR('sceneCopyPattern')); // "Pattern"

    // 1. Quantity
    menu.addSlider(TR('sceneCopyPatternCount'), this._patternCount, this.onPatternCount.bind(this), 1, 20, 1);

    // 2. Translation (Step Offset) - AJUSTADO PARA MAYOR PRECISIÓN
    // Rango reducido a -20/20 y paso (step) bajado a 0.01 para control fino
    menu.addTitle(TR('sceneCopyPatternSpacing') + ' (Offset)');
    menu.addSlider('X', this._patternTranslate[0], this.onPatternTranslateX.bind(this), -20, 20, 0.01);
    menu.addSlider('Y', this._patternTranslate[1], this.onPatternTranslateY.bind(this), -20, 20, 0.01);
    menu.addSlider('Z', this._patternTranslate[2], this.onPatternTranslateZ.bind(this), -20, 20, 0.01);

    // 3. Rotation (Step Rotation)
    menu.addTitle(TR('sceneCopyPatternAngle') + ' (Rotate)');
    menu.addSlider('X', this._patternRotate[0], this.onPatternRotateX.bind(this), -180, 180, 1);
    menu.addSlider('Y', this._patternRotate[1], this.onPatternRotateY.bind(this), -180, 180, 1);
    menu.addSlider('Z', this._patternRotate[2], this.onPatternRotateZ.bind(this), -180, 180, 1);

    // 4. Action Button
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyPattern');
  }

  onPatternCount(val) { this._patternCount = val; }

  // Translation Handlers
  onPatternTranslateX(val) { this._patternTranslate[0] = val; }
  onPatternTranslateY(val) { this._patternTranslate[1] = val; }
  onPatternTranslateZ(val) { this._patternTranslate[2] = val; }

  // Rotation Handlers
  onPatternRotateX(val) { this._patternRotate[0] = val; }
  onPatternRotateY(val) { this._patternRotate[1] = val; }
  onPatternRotateZ(val) { this._patternRotate[2] = val; }

  applyPattern() {
    if (this._isPatternOperationInProgress) {
      console.warn('Pattern operation already in progress.');
      return;
    }

    var selection = this._main.getSelectedMeshes();
    if (!selection.length) {
      window.alert('Please select at least one mesh before applying a pattern.');
      return;
    }

    if (selection.length > 1) {
      window.alert('Please select a single mesh for pattern generation (for now).');
      return;
    }

    this._isPatternOperationInProgress = true;

    try {
      // Call the unified function in Scene.js
      this._main.duplicateSelectionGeneric(
        this._patternCount,
        this._patternTranslate,
        this._patternRotate,
        this._patternScale
      );
    } catch (e) {
      console.error(e);
    } finally {
      this._isPatternOperationInProgress = false;
    }
  }
}

export default GuiPattern;
