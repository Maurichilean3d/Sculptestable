import TR from 'gui/GuiTR';

class GuiPattern {

  constructor(guiParent, ctrlGui) {
    this._guiParent = guiParent; 
    this._main = ctrlGui._main;
    this._menu = null;

    this._mode = 'LINEAR'; 
    this._origin = 'LOCAL'; 

    this._linCount = 3;
    this._linOffset = [0.1, 0.0, 0.0]; 
    this._linRotate = [0.0, 0.0, 0.0];
    this._linScale = [1.0, 1.0, 1.0];

    this._gridCount = [3, 1, 1]; 
    this._gridSpace = [0.1, 0.1, 0.1];

    this._isOperation = false;
    this.init();
  }

  init() {
    if (this._menu) this._menu.remove();

    var menu = this._menu = this._guiParent.addMenu(TR('sceneCopyPattern'));

    menu.addTitle('Settings');
    
    menu.addCombobox('Type', this._mode, this.onModeChange.bind(this), {
      'Linear (Line/Circle)': 'LINEAR',
      'Grid (Array 3D)': 'GRID'
    });

    menu.addCombobox('Reference', this._origin, this.onOriginChange.bind(this), {
      'Local (Selection Axis)': 'LOCAL',
      'World (Global 0,0,0)': 'WORLD'
    });

    if (this._mode === 'LINEAR') {
      this.buildLinearUI(menu);
    } else {
      this.buildGridUI(menu);
    }

    menu.addTitle('Generate');
    menu.addButton(TR('sceneCopyPatternApply'), this, 'applyPattern');
  }

  buildLinearUI(menu) {
    menu.addTitle('Count');
    menu.addSlider('Copies', this._linCount, (v) => { this._linCount = v; }, 1, 50, 1);

    menu.addTitle('Spacing (Offset)');
    menu.addSlider('X', this._linOffset[0], (v) => { this._linOffset[0] = v; }, -1.0, 1.0, 0.001);
    menu.addSlider('Y', this._linOffset[1], (v) => { this._linOffset[1] = v; }, -1.0, 1.0, 0.001);
    menu.addSlider('Z', this._linOffset[2], (v) => { this._linOffset[2] = v; }, -1.0, 1.0, 0.001);

    menu.addTitle('Rotation (Step)');
    menu.addSlider('Rot X', this._linRotate[0], (v) => { this._linRotate[0] = v; }, -180, 180, 1);
    menu.addSlider('Rot Y', this._linRotate[1], (v) => { this._linRotate[1] = v; }, -180, 180, 1);
    menu.addSlider('Rot Z', this._linRotate[2], (v) => { this._linRotate[2] = v; }, -180, 180, 1);
    
    menu.addTitle('Scale (Step)');
    menu.addSlider('Uniform Scale', this._linScale[0], (v) => { 
        this._linScale = [v, v, v]; 
    }, 0.1, 2.0, 0.01);
  }

  buildGridUI(menu) {
    menu.addTitle('Grid Configuration');
    
    menu.addSlider('Columns (X)', this._gridCount[0], (v) => { this._gridCount[0] = v; }, 1, 20, 1);
    menu.addSlider('Space X', this._gridSpace[0], (v) => { this._gridSpace[0] = v; }, -1.0, 1.0, 0.001);

    menu.addSlider('Rows (Y)', this._gridCount[1], (v) => { this._gridCount[1] = v; }, 1, 20, 1);
    menu.addSlider('Space Y', this._gridSpace[1], (v) => { this._gridSpace[1] = v; }, -1.0, 1.0, 0.001);

    menu.addSlider('Levels (Z)', this._gridCount[2], (v) => { this._gridCount[2] = v; }, 1, 20, 1);
    menu.addSlider('Space Z', this._gridSpace[2], (v) => { this._gridSpace[2] = v; }, -1.0, 1.0, 0.001);
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
