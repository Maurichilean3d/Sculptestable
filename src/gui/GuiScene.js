import TR from 'gui/GuiTR';
import Remesh from 'editing/Remesh';
import ShaderBase from 'render/shaders/ShaderBase';

class GuiScene {

  constructor(guiParent, ctrlGui) {
    this._main = ctrlGui._main; // main application
    this._menu = null;
    this.init(guiParent);
  }

  init(guiParent) {
    var menu = this._menu = guiParent.addMenu(TR('sceneTitle'));
    // scene
    menu.addButton(TR('sceneReset'), this, 'clearScene');
    menu.addButton(TR('sceneAddSphere'), this._main, 'addSphere');
    menu.addButton(TR('sceneAddCube'), this._main, 'addCube');
    menu.addButton(TR('sceneAddPlane'), this._main, 'addPlane');
    menu.addButton(TR('sceneAddCylinder'), this._main, 'addCylinder');
    menu.addButton(TR('sceneAddTorus'), this._main, 'addTorus');

    // --- SELECTION MENU ---
    menu.addTitle(TR('sceneSelection'));
    menu.addButton(TR('sceneSelectAll'), this, 'selectAll');

    // >>> NUEVOS BOTONES AÑADIDOS <<<
    menu.addButton('Select Next', this, 'selectNext');
    menu.addButton('Select Previous', this, 'selectPrevious');
    // -------------------------------

    menu.addButton(TR('sceneSelectMore'), this, 'selectMore');
    menu.addButton(TR('sceneSelectLess'), this, 'selectLess');
    this._ctrlIsolate = menu.addCheckbox(TR('renderingIsolate'), false, this.showHide.bind(this));
    this._ctrlIsolate.setVisibility(false);
    this._ctrlMerge = menu.addButton(TR('sceneMerge'), this, 'merge');
    this._ctrlMerge.setVisibility(false);

    menu.addButton(TR('sceneDuplicate'), this, 'duplicateSelection');
    menu.addButton(TR('sceneDelete'), this, 'deleteSelection');

    // extra
    menu.addTitle(TR('renderingExtra'));
    menu.addCheckbox(TR('darkenUnselected'), ShaderBase.darkenUnselected, this.onDarkenUnselected.bind(this));
    menu.addCheckbox(TR('contourShow'), this._main._showContour, this.onShowContour.bind(this));
    menu.addCheckbox(TR('renderingGrid'), this._main._showGrid, this.onShowGrid.bind(this));
    menu.addCheckbox(TR('renderingSymmetryLine'), ShaderBase.showSymmetryLine, this.onShowSymmetryLine.bind(this));
    this._ctrlOffSym = menu.addSlider('SymOffset', 0.0, this.onOffsetSymmetry.bind(this), -1.0, 1.0, 0.001);
  }

  // >>> LÓGICA DE NAVEGACIÓN <<<
  selectNext() {
    var meshes = this._main.getMeshes();
    if (meshes.length === 0) return;
    var currentMesh = this._main.getMesh();
    var index = meshes.indexOf(currentMesh);
    var nextIndex = (index + 1) % meshes.length;
    this._main.setMesh(meshes[nextIndex]);
  }

  selectPrevious() {
    var meshes = this._main.getMeshes();
    if (meshes.length === 0) return;
    var currentMesh = this._main.getMesh();
    var index = meshes.indexOf(currentMesh);
    if (index === -1) index = 0;
    var prevIndex = (index - 1 + meshes.length) % meshes.length;
    this._main.setMesh(meshes[prevIndex]);
  }
  // ----------------------------

  clearScene() {
    if (window.confirm(TR('sceneResetConfirm'))) {
      this._main.clearScene();
    }
  }

  onOffsetSymmetry(val) {
    var mesh = this._main.getMesh();
    if (mesh) {
      mesh.setSymmetryOffset(val);
      this._main.render();
    }
  }

  duplicateSelection() {
    this._main.duplicateSelection();
  }

  deleteSelection() {
    this._main.deleteCurrentSelection();
  }

  selectAll() {
    this._main.selectAllMeshes();
  }

  selectMore() {
    this._main.selectMoreMeshes();
  }

  selectLess() {
    this._main.selectLessMeshes();
  }

  hasHiddenMeshes() {
    var meshes = this._main.getMeshes();
    for (var i = 0; i < meshes.length; ++i) {
      if (!meshes[i].isVisible()) return true;
    }
    return false;
  }

  updateMesh() {
    var nbMeshes = this._main.getMeshes().length;
    var nbSelected = this._main.getSelectedMeshes().length;
    this._ctrlIsolate.setVisibility(this.hasHiddenMeshes() || (nbMeshes !== nbSelected && nbSelected >= 1));
    this._ctrlMerge.setVisibility(nbSelected > 1);

    var mesh = this._main.getMesh();
    this._ctrlOffSym.setValue(mesh ? mesh.getSymmetryOffset() : 0);
  }

  merge() {
    var main = this._main;
    var selMeshes = main.getSelectedMeshes();
    if (selMeshes.length < 2) return;

    var newMesh = Remesh.mergeMeshes(selMeshes, main.getMesh() || selMeshes[0]);
    main.removeMeshes(selMeshes);
    main.getStateManager().pushStateAddRemove(newMesh, selMeshes.slice());
    main.getMeshes().push(newMesh);
    main.setMesh(newMesh);
  }

  toggleShowHide(ignoreCB) {
    this._ctrlIsolate.setValue(!this._ctrlIsolate.getValue(), !!ignoreCB);
  }

  showHide(bool) {
    if (bool) this.isolate();
    else this.showAll();
    this.updateMesh();
  }

  setMeshesVisible(meshes, bool) {
    for (var i = 0; i < meshes.length; ++i) {
      meshes[i].setVisible(bool);
    }
    this._ctrlIsolate.setValue(!bool, true);
  }

  pushSetMeshesVisible(hideMeshes, bool) {
    this.setMeshesVisible(hideMeshes, bool);
    var cbUndo = this.setMeshesVisible.bind(this, hideMeshes, !bool);
    var cbRedo = this.setMeshesVisible.bind(this, hideMeshes, bool);
    this._main.getStateManager().pushStateCustom(cbUndo, cbRedo);
  }

  isolate() {
    var main = this._main;
    var selMeshes = main.getSelectedMeshes();
    var meshes = main.getMeshes();
    if (meshes.length === selMeshes.length || meshes.length < 2) {
      this._ctrlIsolate.setValue(false, true);
      return;
    }

    var hideMeshes = [];
    for (var i = 0; i < meshes.length; ++i) {
      var id = main.getIndexSelectMesh(meshes[i]);
      if (id < 0) hideMeshes.push(meshes[i]);
    }

    this.pushSetMeshesVisible(hideMeshes, false);

    main.render();
  }

  showAll() {
    var main = this._main;
    var meshes = main.getMeshes();

    var hideMeshes = [];
    for (var i = 0; i < meshes.length; ++i) {
      if (!meshes[i].isVisible()) hideMeshes.push(meshes[i]);
    }

    this.pushSetMeshesVisible(hideMeshes, true);

    main.render();
  }

  onDarkenUnselected(val) {
    ShaderBase.darkenUnselected = val;
    this._main.render();
  }

  onShowSymmetryLine(val) {
    ShaderBase.showSymmetryLine = val;
    this._main.render();
  }

  onShowGrid(bool) {
    var main = this._main;
    main._showGrid = bool;
    main.render();
  }

  onShowContour(bool) {
    var main = this._main;
    main._showContour = bool;
    main.render();
  }

  onKeyDown(event) {
    if (event.handled === true) return;
    event.stopPropagation();
    if (!this._main._focusGui) event.preventDefault();
    if (event.which === 73) {
      this.toggleShowHide();
      event.handled = true;
    } else if (event.which === 68 && event.ctrlKey) {
      this._main.duplicateSelection();
      event.handled = true;
    }
  }
}

export default GuiScene;
