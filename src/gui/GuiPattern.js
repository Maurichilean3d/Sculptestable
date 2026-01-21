import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._main = ctrlGui._main;
    this._menu = null;
    this._copyPatternType = 0;
    this._copyPatternCount = 3;
    this._copyPatternSpacing = 10;
    this._copyPatternAngle = 30;
    this._copyPatternRadius = 20;
    this._copyPatternAxis = 2;
    this._isPatternOperationInProgress = false;
    this._ctrlCopyPatternSpacing = null;
    this._ctrlCopyPatternAngle = null;
    this._ctrlCopyPatternRadius = null;
    this.init(guiParent);
  }

  init(guiParent) {
    var menu = this._menu = guiParent.addMenu(TR('sceneCopyPattern'));

    menu.addCombobox(TR('sceneCopyPatternType'), this._copyPatternType, this.onCopyPatternType.bind(this), [
      TR('sceneCopyPatternLinear'),
      TR('sceneCopyPatternPolar')
    ]);
    menu.addSlider(TR('sceneCopyPatternCount'), this._copyPatternCount, this.onCopyPatternCount.bind(this), 1, 20, 1);
    this._ctrlCopyPatternSpacing = menu.addSlider(TR('sceneCopyPatternSpacing'), this._copyPatternSpacing, this.onCopyPatternSpacing.bind(this), 0, 100, 1);
    this._ctrlCopyPatternAngle = menu.addSlider(TR('sceneCopyPatternAngle'), this._copyPatternAngle, this.onCopyPatternAngle.bind(this), 0, 360, 1);
    this._ctrlCopyPatternRadius = menu.addSlider(TR('sceneCopyPatternRadius'), this._copyPatternRadius, this.onCopyPatternRadius.bind(this), 0, 100, 1);
    menu.addCombobox(TR('sceneCopyPatternAxis'), this._copyPatternAxis, this.onCopyPatternAxis.bind(this), ['X', 'Y', 'Z']);
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyCopyPattern');

    this.updateCopyPatternControls();
  }

  onCopyPatternType(val) {
    this._copyPatternType = val;
    this.updateCopyPatternControls();
  }

  onCopyPatternCount(val) {
    this._copyPatternCount = val;
  }

  onCopyPatternSpacing(val) {
    this._copyPatternSpacing = val;
  }

  onCopyPatternAngle(val) {
    this._copyPatternAngle = val;
  }

  onCopyPatternRadius(val) {
    this._copyPatternRadius = val;
  }

  onCopyPatternAxis(val) {
    this._copyPatternAxis = val;
  }

  updateCopyPatternControls() {
    var isLinear = this._copyPatternType === 0;
    this._ctrlCopyPatternSpacing.setVisibility(isLinear);
    this._ctrlCopyPatternAngle.setVisibility(!isLinear);
    this._ctrlCopyPatternRadius.setVisibility(!isLinear);
  }

  applyCopyPattern() {
    if (this._isPatternOperationInProgress) {
      console.warn('Pattern operation already in progress, ignoring duplicate request');
      return;
    }

    var selection = this._main.getSelectedMeshes();
    if (!selection.length) {
      window.alert('Please select at least one mesh before applying a pattern.');
      return;
    }

    if (selection.length > 1) {
      window.alert('Please select a single mesh before applying a pattern.');
      return;
    }

    this._isPatternOperationInProgress = true;

    try {
      if (this._copyPatternType === 0) {
        this._main.duplicateSelectionLinear(this._copyPatternCount, this._copyPatternSpacing, this._copyPatternAxis);
      } else {
        this._main.duplicateSelectionPolar(this._copyPatternCount, this._copyPatternAngle, this._copyPatternRadius, this._copyPatternAxis);
      }
    } finally {
      this._isPatternOperationInProgress = false;
    }
  }
}

export default GuiPattern;
