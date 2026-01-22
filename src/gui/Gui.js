import yagui from 'yagui';
import TR from 'gui/GuiTR';
import GuiBackground from 'gui/GuiBackground';
import GuiCamera from 'gui/GuiCamera';
import GuiConfig from 'gui/GuiConfig';
import GuiFiles from 'gui/GuiFiles';
import GuiMesh from 'gui/GuiMesh';
import GuiPattern from 'gui/GuiPattern';
import GuiTopology from 'gui/GuiTopology';
import GuiRendering from 'gui/GuiRendering';
import GuiScene from 'gui/GuiScene';
import GuiSculpting from 'gui/GuiSculpting';
import GuiStates from 'gui/GuiStates';
import GuiTablet from 'gui/GuiTablet';
import ShaderContour from 'render/shaders/ShaderContour';

import Export from 'files/Export';

class Gui {

  constructor(main) {
    this._main = main;

    this._guiMain = null;
    this._sidebar = null;
    this._topbar = null;

    this._ctrlTablet = null;
    this._ctrlFiles = null;
    this._ctrlScene = null;
    this._ctrlStates = null;
    this._ctrlCamera = null;
    this._ctrlBackground = null;

    this._ctrlSculpting = null;
    this._ctrlTopology = null;
    this._ctrlRendering = null;
    this._ctrlPattern = null;

    this._ctrlNotification = null;

    this._ctrls = []; // list of controllers
    this._toolDock = null;
    this._toolDockButtons = {};
    this._sidebarMenus = {};
    this._activeSidebarMenu = null;
    this._sidebarVisible = false;
    this._isFullscreen = false;

    // upload
    this._notifications = {};
    this._xhrs = {};
  }

  initGui() {
    this.deleteGui();

    this._guiMain = new yagui.GuiMain(this._main.getViewport(), this._main.onCanvasResize.bind(this._main));

    var ctrls = this._ctrls;
    ctrls.length = 0;
    var idc = 0;

    // Initialize the topbar
    this._topbar = this._guiMain.addTopbar();
    ctrls[idc++] = this._ctrlFiles = new GuiFiles(this._topbar, this);
    // this.initPrint(this._topbar);
    ctrls[idc++] = this._ctrlScene = new GuiScene(this._topbar, this);
    ctrls[idc++] = this._ctrlStates = new GuiStates(this._topbar, this);
    ctrls[idc++] = this._ctrlBackground = new GuiBackground(this._topbar, this);
    ctrls[idc++] = this._ctrlCamera = new GuiCamera(this._topbar, this);
    // TODO find a way to get pressure event
    ctrls[idc++] = this._ctrlTablet = new GuiTablet(this._topbar, this);
    ctrls[idc++] = this._ctrlConfig = new GuiConfig(this._topbar, this);
    ctrls[idc++] = this._ctrlMesh = new GuiMesh(this._topbar, this);

    // Initialize the sidebar
    this._sidebar = this._guiMain.addRightSidebar();
    ctrls[idc++] = this._ctrlRendering = new GuiRendering(this._sidebar, this);
    ctrls[idc++] = this._ctrlTopology = new GuiTopology(this._sidebar, this);
    ctrls[idc++] = this._ctrlSculpting = new GuiSculpting(this._sidebar, this);
    ctrls[idc++] = this._ctrlPattern = new GuiPattern(this._sidebar, this);

    // gui extra
    var extra = this._topbar.addExtra();
    // Extra : Настройка интерфейса
    extra.addTitle(TR('contour'));
    extra.addColor(TR('contourColor'), ShaderContour.color, this.onContourColor.bind(this));

    extra.addTitle(TR('resolution'));
    extra.addSlider('', this._main._pixelRatio, this.onPixelRatio.bind(this), 0.5, 2.0, 0.02);

    this.addAboutButton();
    this.initToolDock();

    this.updateMesh();
    this.setVisibility(true);

    if (window.postprocessGui) window.postprocessGui();
  }

  getNotification(notifName) {
    var notif = this._notifications[notifName];
    if (!notif) {
      notif = this._topbar.addMenu();
      notif.isVisible = function () {
        return !this.domContainer.hidden;
      };
      notif.setMessage = function (msg) {
        this.domContainer.innerHTML = msg;
        this.setVisibility(!!msg);
      };

      notif.domContainer.style.color = 'red';
      notif.setMessage('');

      this._notifications[notifName] = notif;
      return notif;
    }

    if (this._xhrs[notifName] && notif.isVisible()) {
      if (window.confirm('Abort ' + notifName + ' previous upload?')) {
        this._xhrs[notifName].abort();
        this._xhrs[notifName].isAborted = true;
        notif.setMessage(null);
      }
      return;
    }

    return notif;
  }

  initPrint(guiParent) {
    var menu = guiParent.addMenu('Print it!');
    // menu.addButton('with Sculpteo', this, 'exportSculpteo');
    menu.addButton('Go to Materialise!', this, 'exportMaterialise');
  }

  exportSculpteo() {
    this._export('sculpteo');
  }

  exportMaterialise() {
    if (window.confirm('A new webpage will be opened. Start upload?')) {
      this._export('materialise');
    }
  }

  exportSketchfab() {
    this._export('sketchfab');
  }

  _export(notifName) {
    var mesh = this._main.getMesh();
    if (!mesh) return;

    var notif = this.getNotification(notifName);
    if (!notif) return;

    var fName = 'export' + notifName.charAt(0).toUpperCase() + notifName.slice(1);
    this._xhrs[notifName] = Export[fName](this._main, notif);
  }

  onPixelRatio(val) {
    this._main._pixelRatio = val;
    this._main.onCanvasResize();
  }

  onContourColor(col) {
    ShaderContour.color[0] = col[0];
    ShaderContour.color[1] = col[1];
    ShaderContour.color[2] = col[2];
    ShaderContour.color[3] = col[3];
    this._main.render();
  }

  addAboutButton() {
    var ctrlAbout = this._topbar.addMenu();
    ctrlAbout.domContainer.innerHTML = TR('about');
    ctrlAbout.domContainer.addEventListener('mousedown', function () {
      window.open('http://stephaneginier.com', '_blank');
    });
  }

  initToolDock() {
    if (this._toolDock) this._toolDock.remove();

    this._toolDock = document.createElement('div');
    this._toolDock.className = 'gui-tool-dock';

    this._sidebarMenus = {
      rendering: this._ctrlRendering._menu,
      topology: this._ctrlTopology._menu,
      sculpting: this._ctrlSculpting._menu,
      pattern: this._ctrlPattern._menu
    };

    Object.values(this._sidebarMenus).forEach((menu) => menu.setVisibility(false));
    this._sidebar.setVisibility(false);
    this._sidebarVisible = false;

    this._toolDockButtons = {};
    this._addToolButton('rendering', 'R', () => this.toggleSidebarMenu('rendering'));
    this._addToolButton('topology', 'T', () => this.toggleSidebarMenu('topology'));
    this._addToolButton('sculpting', 'S', () => this.toggleSidebarMenu('sculpting'));
    this._addToolButton('pattern', 'P', () => this.toggleSidebarMenu('pattern'));
    this._addToolButton('rotate', '⟳', () => this.toggleAutoRotate());
    this._addToolButton('fullscreen', '⛶', () => this.toggleFullscreen());

    document.body.appendChild(this._toolDock);
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
  }

  _addToolButton(id, label, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'gui-tool-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    this._toolDock.appendChild(button);
    this._toolDockButtons[id] = button;
  }

  toggleSidebarMenu(id) {
    var menu = this._sidebarMenus[id];
    if (!menu) return;

    var isActive = this._activeSidebarMenu === id && this._sidebarVisible;
    if (isActive) {
      this._sidebar.setVisibility(false);
      this._sidebarVisible = false;
      this._activeSidebarMenu = null;
      this._setActiveTool(null);
      return;
    }

    this._sidebar.setVisibility(true);
    this._sidebarVisible = true;
    this._activeSidebarMenu = id;

    Object.keys(this._sidebarMenus).forEach((key) => {
      this._sidebarMenus[key].setVisibility(key === id);
    });

    this._setActiveTool(id);
  }

  _setActiveTool(id) {
    Object.keys(this._toolDockButtons).forEach((key) => {
      this._toolDockButtons[key].classList.toggle('is-active', key === id);
    });
  }

  toggleAutoRotate() {
    var enabled = !this._main._autoRotateEnabled;
    this._main.setAutoRotateEnabled(enabled);
    if (this._ctrlSculpting && this._ctrlSculpting._ctrlRotomold) {
      this._ctrlSculpting._ctrlRotomold.setValue(enabled, true);
    }
    if (enabled && this._activeSidebarMenu !== 'sculpting') {
      this.toggleSidebarMenu('sculpting');
    }
    if (enabled && this._ctrlSculpting && this._ctrlSculpting.focusRotomold) {
      this._ctrlSculpting.focusRotomold();
    }
    if (this._toolDockButtons.rotate) {
      this._toolDockButtons.rotate.classList.toggle('is-on', enabled);
    }
    this._main.render();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      return;
    }
    document.exitFullscreen().catch(() => {});
  }

  onFullscreenChange() {
    this._isFullscreen = !!document.fullscreenElement;
    if (this._toolDockButtons.fullscreen) {
      this._toolDockButtons.fullscreen.classList.toggle('is-on', this._isFullscreen);
    }
  }

  updateMesh() {
    this._ctrlRendering.updateMesh();
    this._ctrlTopology.updateMesh();
    this._ctrlSculpting.updateMesh();
    this._ctrlScene.updateMesh();
    this.updateMeshInfo();
  }

  updateMeshInfo() {
    this._ctrlMesh.updateMeshInfo();
  }

  getFlatShading() {
    return this._ctrlRendering.getFlatShading();
  }

  getWireframe() {
    return this._ctrlRendering.getWireframe();
  }

  getShaderType() {
    return this._ctrlRendering.getShaderType();
  }

  addAlphaOptions(opts) {
    this._ctrlSculpting.addAlphaOptions(opts);
  }

  deleteGui() {
    if (!this._guiMain || !this._guiMain.domMain.parentNode)
      return;
    this.callFunc('removeEvents');
    this.setVisibility(false);
    this._guiMain.domMain.parentNode.removeChild(this._guiMain.domMain);
  }

  setVisibility(bool) {
    this._guiMain.setVisibility(bool);
  }

  callFunc(func, event) {
    for (var i = 0, ctrls = this._ctrls, nb = ctrls.length; i < nb; ++i) {
      var ct = ctrls[i];
      if (ct && ct[func])
        ct[func](event);
    }
  }
}

export default Gui;
