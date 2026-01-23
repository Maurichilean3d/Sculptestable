import TR from 'gui/GuiTR';
import Enums from 'misc/Enums';

class GuiMetaballs {

  constructor(guiParent, ctrlGui) {
    this._guiParent = guiParent;
    this._main = ctrlGui._main;
    this._menu = null;

    // Parámetros de metaballs
    this._radius = 50;
    this._resolution = 30;
    this._smoothness = 40.0;

    this._isDrawing = false;
    this.init();
  }

  init() {
    if (this._menu) this._menu.remove();

    var menu = this._menu = this._guiParent.addMenu(TR('sculptMetaballs'));

    menu.addTitle('Metaballs Settings');

    menu.addSlider('Radius', this._radius, this.onRadiusChange.bind(this), 5, 200, 1);
    menu.addSlider('Resolution', this._resolution, this.onResolutionChange.bind(this), 10, 60, 1);
    menu.addSlider('Smoothness', this._smoothness, this.onSmoothnessChange.bind(this), 1, 100, 1);

    menu.addTitle('Instructions');
    var infoDiv = document.createElement('div');
    infoDiv.style.padding = '10px';
    infoDiv.style.fontSize = '12px';
    infoDiv.style.lineHeight = '1.4';
    infoDiv.innerHTML = 'Click and drag on the mesh to create smooth metaballs. Each stroke will blend seamlessly into the existing geometry.';
    menu.domContainer.appendChild(infoDiv);
  }

  onRadiusChange(val) {
    this._radius = val;
    var tool = this._main.getSculptManager().getTool(Enums.Tools.METABALLS);
    if (tool) tool._radius = val;
  }

  onResolutionChange(val) {
    this._resolution = val;
    var tool = this._main.getSculptManager().getTool(Enums.Tools.METABALLS);
    if (tool) tool._resolution = val;
  }

  onSmoothnessChange(val) {
    this._smoothness = val;
    var tool = this._main.getSculptManager().getTool(Enums.Tools.METABALLS);
    if (tool) tool._smoothness = val;
  }

  activateMetaballsTool() {
    // Activar la herramienta de metaballs cuando se abre este menú
    this._main.getSculptManager().setToolIndex(Enums.Tools.METABALLS);

    // Actualizar los valores de la herramienta
    var tool = this._main.getSculptManager().getTool(Enums.Tools.METABALLS);
    if (tool) {
      tool._radius = this._radius;
      tool._resolution = this._resolution;
      tool._smoothness = this._smoothness;
    }
  }

  updateMesh() {
    this._menu.setVisibility(!!this._main.getMesh());
  }
}

export default GuiMetaballs;
