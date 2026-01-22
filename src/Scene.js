import { vec3, mat4, quat } from 'gl-matrix';
import getOptionsURL from 'misc/getOptionsURL';
import Enums from 'misc/Enums';
import Utils from 'misc/Utils';
import SculptManager from 'editing/SculptManager';
import Subdivision from 'editing/Subdivision';
import Import from 'files/Import';
import Gui from 'gui/Gui';
import Camera from 'math3d/Camera';
import Picking from 'math3d/Picking';
import Background from 'drawables/Background';
import Mesh from 'mesh/Mesh';
import Multimesh from 'mesh/multiresolution/Multimesh';
import Primitives from 'drawables/Primitives';
import StateManager from 'states/StateManager';
import RenderData from 'mesh/RenderData';
import Rtt from 'drawables/Rtt';
import ShaderLib from 'render/ShaderLib';
import MeshStatic from 'mesh/meshStatic/MeshStatic';
import WebGLCaps from 'render/WebGLCaps';

var _TMP_AUTO_ROT_CENTER = vec3.create();
var _TMP_AUTO_ROT_AXIS = vec3.create();
var _TMP_AUTO_ROT_MAT = mat4.create();

// Constantes para el Gizmo de Orientación
var GIZMO_VIEWPORT_SIZE = 100; // Tamaño en píxeles
var GIZMO_OFFSET_X = 10;
var GIZMO_OFFSET_Y = 10;

class Scene {

  constructor() {
    this._gl = null;
    this._cameraSpeed = 0.25;
    this._pixelRatio = 1.0;
    this._viewport = document.getElementById('viewport');
    this._canvas = document.getElementById('canvas');
    this._canvasWidth = 0;
    this._canvasHeight = 0;
    this._canvasOffsetLeft = 0;
    this._canvasOffsetTop = 0;
    this._stateManager = new StateManager(this);
    this._sculptManager = null;
    this._camera = new Camera(this);
    this._picking = new Picking(this);
    this._pickingSym = new Picking(this, true);
    this._meshPreview = null;
    this._torusLength = 0.5;
    this._torusWidth = 0.1;
    this._torusRadius = Math.PI * 2;
    this._torusRadial = 32;
    this._torusTubular = 128;
    var opts = getOptionsURL();
    this._showContour = opts.outline;
    this._showGrid = opts.grid;
    this._grid = null;
    this._background = null;
    this._meshes = [];
    this._selectMeshes = [];
    this._mesh = null;
    this._rttContour = null;
    this._rttMerge = null;
    this._rttOpaque = null;
    this._rttTransparent = null;
    this._focusGui = false;
    this._gui = new Gui(this);
    this._preventRender = false;
    this._drawFullScene = false;
    this._autoMatrix = opts.scalecenter;
    this._vertexSRGB = true;
    this._autoRotateEnabled = false;
    this._autoRotateSpeed = Math.PI / 6.0;
    this._autoRotateAxis = 1;
    this._autoRotatePivot = 0;
    this._autoRotateLastTime = null;

    // Orientation Gizmo Meshes
    this._gizmoArrows = []; 
  }

  start() {
    this.initWebGL();
    if (!this._gl) return;
    this._sculptManager = new SculptManager(this);
    this._background = new Background(this._gl, this);
    this._rttContour = new Rtt(this._gl, Enums.Shader.CONTOUR, null);
    this._rttMerge = new Rtt(this._gl, Enums.Shader.MERGE, null);
    this._rttOpaque = new Rtt(this._gl, Enums.Shader.FXAA);
    this._rttTransparent = new Rtt(this._gl, null, this._rttOpaque.getDepth(), true);
    this._grid = Primitives.createGrid(this._gl);
    this.initGrid();
    
    // Inicializar el Gizmo de Orientación (Flechas RGB)
    this._initOrientationGizmo();

    this.loadTextures();
    this._gui.initGui();
    this.onCanvasResize();
    var modelURL = getOptionsURL().modelurl;
    if (modelURL) this.addModelURL(modelURL);
    else this.addSphere();
  }

  _initOrientationGizmo() {
    var gl = this._gl;
    // X Axis (Rojo)
    var arrowX = Primitives.createArrow(gl, 0.08, 1.5, 0.3, 0.4);
    arrowX.setFlatColor([0.8, 0.1, 0.1]); // Rojo
    var matX = arrowX.getMatrix();
    mat4.rotateZ(matX, matX, -Math.PI / 2); // Orientar en X
    
    // Y Axis (Verde)
    var arrowY = Primitives.createArrow(gl, 0.08, 1.5, 0.3, 0.4);
    arrowY.setFlatColor([0.1, 0.8, 0.1]); // Verde
    // Por defecto apunta arriba (Y)

    // Z Axis (Azul)
    var arrowZ = Primitives.createArrow(gl, 0.08, 1.5, 0.3, 0.4);
    arrowZ.setFlatColor([0.1, 0.1, 0.8]); // Azul
    var matZ = arrowZ.getMatrix();
    mat4.rotateX(matZ, matZ, Math.PI / 2); // Orientar en Z

    this._gizmoArrows = [arrowX, arrowY, arrowZ];
    
    // Configurar Shader Flat para que no le afecten luces complejas
    this._gizmoArrows.forEach(m => m.setShaderType(Enums.Shader.FLAT));
  }

  addModelURL(url) {
    var fileType = this.getFileType(url);
    if (!fileType) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = fileType === 'obj' ? 'text' : 'arraybuffer';
    xhr.onload = function () {
      if (xhr.status === 200) this.loadScene(xhr.response, fileType);
    }.bind(this);
    xhr.send(null);
  }

  getBackground() { return this._background; }
  getViewport() { return this._viewport; }
  getCanvas() { return this._canvas; }
  getPixelRatio() { return this._pixelRatio; }
  getCanvasWidth() { return this._canvasWidth; }
  getCanvasHeight() { return this._canvasHeight; }
  getCamera() { return this._camera; }
  getGui() { return this._gui; }
  getMeshes() { return this._meshes; }
  getMesh() { return this._mesh; }
  getSelectedMeshes() { return this._selectMeshes; }
  getPicking() { return this._picking; }
  getPickingSymmetry() { return this._pickingSym; }
  getSculptManager() { return this._sculptManager; }
  getStateManager() { return this._stateManager; }
  setMesh(mesh) { return this.setOrUnsetMesh(mesh); }
  setCanvasCursor(style) { this._canvas.style.cursor = style; }
  
  setAutoRotateEnabled(enabled) {
    this._autoRotateEnabled = enabled;
    this._autoRotateLastTime = null;
    if (enabled) this.render();
  }
  setAutoRotateSpeed(speed) { this._autoRotateSpeed = speed; }
  setAutoRotateAxis(axis) { this._autoRotateAxis = axis; }
  setAutoRotatePivot(pivot) { this._autoRotatePivot = pivot; }

  _updateAutoRotate() {
    if (!this._autoRotateEnabled || !this._mesh) return;
    var now = performance.now();
    if (this._autoRotateLastTime === null) {
      this._autoRotateLastTime = now;
      return;
    }
    var deltaSeconds = (now - this._autoRotateLastTime) / 1000.0;
    this._autoRotateLastTime = now;
    var speed = this._autoRotateSpeed;
    if (!speed) return;
    var rot = speed * deltaSeconds;
    var mesh = this._mesh;
    var mat = mesh.getMatrix();
    vec3.set(_TMP_AUTO_ROT_AXIS, 0.0, 0.0, 0.0);
    _TMP_AUTO_ROT_AXIS[this._autoRotateAxis] = 1.0;
    mat4.identity(_TMP_AUTO_ROT_MAT);
    if (this._autoRotatePivot === 0) {
      vec3.transformMat4(_TMP_AUTO_ROT_CENTER, mesh.getCenter(), mat);
      mat4.translate(_TMP_AUTO_ROT_MAT, _TMP_AUTO_ROT_MAT, _TMP_AUTO_ROT_CENTER);
      mat4.rotate(_TMP_AUTO_ROT_MAT, _TMP_AUTO_ROT_MAT, rot, _TMP_AUTO_ROT_AXIS);
      mat4.translate(_TMP_AUTO_ROT_MAT, _TMP_AUTO_ROT_MAT, [-_TMP_AUTO_ROT_CENTER[0], -_TMP_AUTO_ROT_CENTER[1], -_TMP_AUTO_ROT_CENTER[2]]);
    } else {
      mat4.rotate(_TMP_AUTO_ROT_MAT, _TMP_AUTO_ROT_MAT, rot, _TMP_AUTO_ROT_AXIS);
    }
    mat4.mul(mat, _TMP_AUTO_ROT_MAT, mat);
    mesh.updateYawPitchRollFromMatrix();
  }

  initGrid() {
    var grid = this._grid;
    grid.normalizeSize();
    var gridm = grid.getMatrix();
    mat4.translate(gridm, gridm, [0.0, -0.45, 0.0]);
    var scale = 2.5;
    mat4.scale(gridm, gridm, [scale, scale, scale]);
    this._grid.setShaderType(Enums.Shader.FLAT);
    grid.setFlatColor([0.04, 0.04, 0.04]);
  }

  setOrUnsetMesh(mesh, multiSelect) {
    if (!mesh) {
      this._selectMeshes.length = 0;
    } else if (!multiSelect) {
      this._selectMeshes.length = 0;
      this._selectMeshes.push(mesh);
    } else {
      var id = this.getIndexSelectMesh(mesh);
      if (id >= 0) {
        if (this._selectMeshes.length > 1) {
          this._selectMeshes.splice(id, 1);
          mesh = this._selectMeshes[0];
        }
      } else {
        this._selectMeshes.push(mesh);
      }
    }
    this._mesh = mesh;
    this.getGui().updateMesh();
    this.render();
    return mesh;
  }

  selectAllMeshes() {
    if (!this._meshes.length) return;
    this._selectMeshes = this._meshes.slice();
    this._mesh = this._selectMeshes[0] || null;
    this.getGui().updateMesh();
    this.render();
  }

  selectMoreMeshes() {
    if (!this._meshes.length) return;
    if (!this._mesh) {
      this.setOrUnsetMesh(this._meshes[0], false);
      return;
    }
    if (this._selectMeshes.length === this._meshes.length) return;
    var startIndex = this.getIndexMesh(this._mesh);
    if (startIndex < 0) startIndex = 0;
    for (var offset = 1; offset <= this._meshes.length; ++offset) {
      var idx = (startIndex + offset) % this._meshes.length;
      var candidate = this._meshes[idx];
      if (this.getIndexSelectMesh(candidate) < 0) {
        this._selectMeshes.push(candidate);
        this._mesh = candidate;
        this.getGui().updateMesh();
        this.render();
        return;
      }
    }
  }

  selectLessMeshes() {
    if (!this._selectMeshes.length) return;
    var idx = this.getIndexSelectMesh(this._mesh);
    if (idx < 0) idx = this._selectMeshes.length - 1;
    this._selectMeshes.splice(idx, 1);
    if (!this._selectMeshes.length) {
      this._mesh = null;
    } else {
      this._mesh = this._selectMeshes[0];
    }
    this.getGui().updateMesh();
    this.render();
  }

  renderSelectOverRtt() {
    if (this._requestRender()) this._drawFullScene = false;
  }

  _requestRender() {
    if (this._preventRender === true) return false;
    window.requestAnimationFrame(this.applyRender.bind(this));
    this._preventRender = true;
    return true;
  }

  render() {
    this._drawFullScene = true;
    this._requestRender();
  }

  applyRender() {
    this._preventRender = false;
    this._updateAutoRotate();
    this.updateMatricesAndSort();
    var gl = this._gl;
    if (!gl) return;
    
    // 1. Dibujar Escena Principal
    if (this._drawFullScene) this._drawScene();
    
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._rttMerge.getFramebuffer());
    this._rttMerge.render(this);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this._rttOpaque.render(this);
    gl.enable(gl.DEPTH_TEST);
    
    this._sculptManager.postRender();

    // 2. DIBUJAR GIZMO DE ORIENTACIÓN (Esquina Superior Derecha)
    this._drawOrientationGizmo();

    if (this._autoRotateEnabled && this._mesh) this.render();
  }

  // --- Nueva función para el Gizmo ---
  _drawOrientationGizmo() {
    var gl = this._gl;
    var cw = this._canvasWidth;
    var ch = this._canvasHeight;

    // Configurar viewport pequeño en la esquina superior derecha
    gl.viewport(cw - GIZMO_VIEWPORT_SIZE - GIZMO_OFFSET_X, ch - GIZMO_VIEWPORT_SIZE - GIZMO_OFFSET_Y, GIZMO_VIEWPORT_SIZE, GIZMO_VIEWPORT_SIZE);
    
    // Limpiar depth para que se dibuje encima de todo
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Crear una cámara temporal que solo rota
    // Usamos una cámara fija alejada para ver el gizmo
    var gizmoCam = new Camera(this); 
    gizmoCam._view = mat4.clone(this._camera._view); // Copiar rotación de la cámara principal
    
    // Anular la traslación de la cámara (queremos que rote sobre sí misma 0,0,0)
    gizmoCam._view[12] = 0;
    gizmoCam._view[13] = 0;
    gizmoCam._view[14] = -5.0; // Alejar un poco para ver las flechas

    // Renderizar flechas
    this._gizmoArrows.forEach(arrow => {
        arrow.updateMatrices(gizmoCam);
        arrow.render(this);
    });

    // Restaurar viewport original
    gl.viewport(0, 0, cw, ch);
  }
  // -----------------------------------

  _drawScene() {
    var gl = this._gl;
    var i = 0;
    var meshes = this._meshes;
    var nbMeshes = meshes.length;
    gl.disable(gl.DEPTH_TEST);
    var showContour = this._selectMeshes.length > 0 && this._showContour && ShaderLib[Enums.Shader.CONTOUR].color[3] > 0.0;
    if (showContour) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._rttContour.getFramebuffer());
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (var s = 0, sel = this._selectMeshes, nbSel = sel.length; s < nbSel; ++s)
        sel[s].renderFlatColor(this);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._rttOpaque.getFramebuffer());
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (this._showGrid) this._grid.render(this);
    for (i = 0; i < nbMeshes; ++i) {
      if (meshes[i].isTransparent()) break;
      meshes[i].render(this);
    }
    var startTransparent = i;
    if (this._meshPreview) this._meshPreview.render(this);
    this._background.render();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._rttTransparent.getFramebuffer());
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LESS);
    for (i = 0; i < nbMeshes; ++i) {
      if (meshes[i].getShowWireframe()) meshes[i].renderWireframe(this);
    }
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.enable(gl.CULL_FACE);
    for (i = startTransparent; i < nbMeshes; ++i) {
      gl.cullFace(gl.FRONT);
      meshes[i].render(this);
      gl.cullFace(gl.BACK);
      meshes[i].render(this);
    }
    gl.disable(gl.CULL_FACE);
    if (showContour) {
      this._rttContour.render(this);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  updateMatricesAndSort() {
    var meshes = this._meshes;
    var cam = this._camera;
    if (meshes.length > 0) cam.optimizeNearFar(this.computeBoundingBoxScene());
    for (var i = 0, nb = meshes.length; i < nb; ++i) meshes[i].updateMatrices(cam);
    meshes.sort(Mesh.sortFunction);
    if (this._meshPreview) this._meshPreview.updateMatrices(cam);
    if (this._grid) this._grid.updateMatrices(cam);
  }

  initWebGL() {
    var attributes = { antialias: false, stencil: true };
    var canvas = document.getElementById('canvas');
    var gl = this._gl = canvas.getContext('webgl', attributes) || canvas.getContext('experimental-webgl', attributes);
    if (!gl) {
      window.alert('Could not initialise WebGL. No WebGL, no SculptGL. Sorry.');
      return;
    }
    WebGLCaps.initWebGLExtensions(gl);
    if (!WebGLCaps.getWebGLExtension('OES_element_index_uint')) RenderData.ONLY_DRAW_ARRAYS = true;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.disable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  loadTextures() {
    var self = this;
    var gl = this._gl;
    var ShaderMatcap = ShaderLib[Enums.Shader.MATCAP];
    var loadTex = function (path, idMaterial) {
      var mat = new Image();
      mat.src = path;
      mat.onload = function () {
        ShaderMatcap.createTexture(gl, mat, idMaterial);
        self.render();
      };
    };
    for (var i = 0, mats = ShaderMatcap.matcaps, l = mats.length; i < l; ++i) loadTex(mats[i].path, i);
    this.initAlphaTextures();
  }

  initAlphaTextures() {
    var alphas = Picking.INIT_ALPHAS_PATHS;
    var names = Picking.INIT_ALPHAS_NAMES;
    for (var i = 0, nbA = alphas.length; i < nbA; ++i) {
      var am = new Image();
      am.src = Utils.getResourcePath('alpha/' + alphas[i]);
      am.onload = this.onLoadAlphaImage.bind(this, am, names[i]);
    }
  }

  onCanvasResize() {
    var viewport = this._viewport;
    var newWidth = viewport.clientWidth * this._pixelRatio;
    var newHeight = viewport.clientHeight * this._pixelRatio;
    this._canvasOffsetLeft = viewport.offsetLeft;
    this._canvasOffsetTop = viewport.offsetTop;
    this._canvasWidth = newWidth;
    this._canvasHeight = newHeight;
    this._canvas.width = newWidth;
    this._canvas.height = newHeight;
    this._gl.viewport(0, 0, newWidth, newHeight);
    this._camera.onResize(newWidth, newHeight);
    this._background.onResize(newWidth, newHeight);
    this._rttContour.onResize(newWidth, newHeight);
    this._rttMerge.onResize(newWidth, newHeight);
    this._rttOpaque.onResize(newWidth, newHeight);
    this._rttTransparent.onResize(newWidth, newHeight);
    this.render();
  }

  computeRadiusFromBoundingBox(box) {
    var dx = box[3] - box[0];
    var dy = box[4] - box[1];
    var dz = box[5] - box[2];
    return 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  computeBoundingBoxMeshes(meshes) {
    var bound = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (var i = 0, l = meshes.length; i < l; ++i) {
      if (!meshes[i].isVisible()) continue;
      var bi = meshes[i].computeWorldBound();
      if (bi[0] < bound[0]) bound[0] = bi[0];
      if (bi[1] < bound[1]) bound[1] = bi[1];
      if (bi[2] < bound[2]) bound[2] = bi[2];
      if (bi[3] > bound[3]) bound[3] = bi[3];
      if (bi[4] > bound[4]) bound[4] = bi[4];
      if (bi[5] > bound[5]) bound[5] = bi[5];
    }
    return bound;
  }

  computeBoundingBoxScene() {
    var scene = this._meshes.slice();
    scene.push(this._grid);
    this._sculptManager.addSculptToScene(scene);
    return this.computeBoundingBoxMeshes(scene);
  }

  normalizeAndCenterMeshes(meshes) {
    var box = this.computeBoundingBoxMeshes(meshes);
    var scale = Utils.SCALE / vec3.dist([box[0], box[1], box[2]], [box[3], box[4], box[5]]);
    var mCen = mat4.create();
    mat4.scale(mCen, mCen, [scale, scale, scale]);
    mat4.translate(mCen, mCen, [-(box[0] + box[3]) * 0.5, -(box[1] + box[4]) * 0.5, -(box[2] + box[5]) * 0.5]);
    for (var i = 0, l = meshes.length; i < l; ++i) {
      var mat = meshes[i].getMatrix();
      mat4.mul(mat, mCen, mat);
    }
  }

  addSphere() {
    var mesh = new Multimesh(Primitives.createCube(this._gl));
    mesh.normalizeSize();
    this.subdivideClamp(mesh);
    return this.addNewMesh(mesh);
  }

  addCube() {
    var mesh = new Multimesh(Primitives.createCube(this._gl));
    mesh.normalizeSize();
    mat4.scale(mesh.getMatrix(), mesh.getMatrix(), [0.7, 0.7, 0.7]);
    this.subdivideClamp(mesh, true);
    return this.addNewMesh(mesh);
  }

  addPlane() {
    var mesh = new Multimesh(Primitives.createPlane(this._gl));
    mesh.normalizeSize();
    this.subdivideClamp(mesh, true);
    return this.addNewMesh(mesh);
  }

  addCylinder() {
    var mesh = new Multimesh(Primitives.createCylinder(this._gl));
    mesh.normalizeSize();
    mat4.scale(mesh.getMatrix(), mesh.getMatrix(), [0.7, 0.7, 0.7]);
    this.subdivideClamp(mesh);
    return this.addNewMesh(mesh);
  }

  addTorus(preview) {
    var mesh = new Multimesh(Primitives.createTorus(this._gl, this._torusLength, this._torusWidth, this._torusRadius, this._torusRadial, this._torusTubular));
    if (preview) {
      mesh.setShowWireframe(true);
      var scale = 0.3 * Utils.SCALE;
      mat4.scale(mesh.getMatrix(), mesh.getMatrix(), [scale, scale, scale]);
      this._meshPreview = mesh;
      return;
    }
    mesh.normalizeSize();
    this.subdivideClamp(mesh);
    this.addNewMesh(mesh);
  }

  subdivideClamp(mesh, linear) {
    Subdivision.LINEAR = !!linear;
    while (mesh.getNbFaces() < 50000) mesh.addLevel();
    mesh._meshes.splice(0, Math.min(mesh._meshes.length - 4, 4));
    mesh._sel = mesh._meshes.length - 1;
    Subdivision.LINEAR = false;
  }

  addNewMesh(mesh) {
    this._meshes.push(mesh);
    this._stateManager.pushStateAdd(mesh);
    this.setMesh(mesh);
    return mesh;
  }

  addNewMeshBatch(mesh) {
    this._meshes.push(mesh);
    return mesh;
  }

  loadScene(fileData, fileType) {
    var newMeshes;
    if (fileType === 'obj') newMeshes = Import.importOBJ(fileData, this._gl);
    else if (fileType === 'sgl') newMeshes = Import.importSGL(fileData, this._gl, this);
    else if (fileType === 'stl') newMeshes = Import.importSTL(fileData, this._gl);
    else if (fileType === 'ply') newMeshes = Import.importPLY(fileData, this._gl);
    var nbNewMeshes = newMeshes.length;
    if (nbNewMeshes === 0) return;
    var meshes = this._meshes;
    for (var i = 0; i < nbNewMeshes; ++i) {
      var mesh = newMeshes[i] = new Multimesh(newMeshes[i]);
      if (!this._vertexSRGB && mesh.getColors()) Utils.convertArrayVec3toSRGB(mesh.getColors());
      mesh.init();
      mesh.initRender();
      meshes.push(mesh);
    }
    if (this._autoMatrix) this.normalizeAndCenterMeshes(newMeshes);
    this._stateManager.pushStateAdd(newMeshes);
    this.setMesh(meshes[meshes.length - 1]);
    this.resetCameraMeshes(newMeshes);
    return newMeshes;
  }

  clearScene() {
    this.getStateManager().reset();
    this.getMeshes().length = 0;
    this.getCamera().resetView();
    this.setMesh(null);
    this._action = Enums.Action.NOTHING;
  }

  deleteCurrentSelection() {
    if (!this._mesh) return;
    this.removeMeshes(this._selectMeshes);
    this._stateManager.pushStateRemove(this._selectMeshes.slice());
    this._selectMeshes.length = 0;
    this.setMesh(null);
  }

  removeMeshes(rm) {
    var meshes = this._meshes;
    for (var i = 0; i < rm.length; ++i) meshes.splice(this.getIndexMesh(rm[i]), 1);
  }

  getIndexMesh(mesh, select) {
    var meshes = select ? this._selectMeshes : this._meshes;
    var id = mesh.getID();
    for (var i = 0, nbMeshes = meshes.length; i < nbMeshes; ++i) {
      var testMesh = meshes[i];
      if (testMesh === mesh || testMesh.getID() === id) return i;
    }
    return -1;
  }

  getIndexSelectMesh(mesh) { return this.getIndexMesh(mesh, true); }

  replaceMesh(mesh, newMesh) {
    var index = this.getIndexMesh(mesh);
    if (index >= 0) this._meshes[index] = newMesh;
    if (this._mesh === mesh) this.setMesh(newMesh);
  }

  duplicateSelection() {
    var meshes = this._selectMeshes.slice();
    var mesh = null;
    for (var i = 0; i < meshes.length; ++i) {
      mesh = meshes[i];
      var copy = this._createMeshCopy(mesh);
      this.addNewMesh(copy);
    }
    this.setMesh(mesh);
  }

  // --- FUNCIÓN RESTAURADA Y MEJORADA PARA PATTERN TOOL ---
  createPattern(patterns, useWorldReference) {
    if (!this._selectMeshes.length) return;
    if (!patterns || !patterns.length) return;

    var totalCopies = 1;
    for (var p = 0; p < patterns.length; ++p) {
      totalCopies *= Math.max(1, Math.floor(patterns[p].count));
    }
    
    var HARD_LIMIT = 200; 
    if (totalCopies > HARD_LIMIT) {
      if (!window.confirm(`Warning: This will create ${totalCopies} copies. Continue?`)) return;
    }

    var currentGeneration = this._selectMeshes.slice();
    var allNewCopies = []; 

    try {
      for (var d = 0; d < patterns.length; ++d) {
        var config = patterns[d];
        var count = Math.floor(config.count);
        if (count <= 1) continue; 

        var stepMatrix = mat4.create();
        mat4.identity(stepMatrix);
        // Orden estándar de transformaciones: Translate -> Rotate -> Scale
        // Este orden hace que: 1) las copias se desplacen, 2) roten en su lugar, 3) escalen
        mat4.translate(stepMatrix, stepMatrix, config.offset);
        if (config.rotate[0]) mat4.rotateX(stepMatrix, stepMatrix, config.rotate[0] * Math.PI / 180);
        if (config.rotate[1]) mat4.rotateY(stepMatrix, stepMatrix, config.rotate[1] * Math.PI / 180);
        if (config.rotate[2]) mat4.rotateZ(stepMatrix, stepMatrix, config.rotate[2] * Math.PI / 180);
        if (config.scale) mat4.scale(stepMatrix, stepMatrix, config.scale);

        var nextGeneration = currentGeneration.slice(); 
        var accumMatrix = mat4.create();
        mat4.identity(accumMatrix);

        for (var c = 1; c < count; ++c) {
          mat4.mul(accumMatrix, accumMatrix, stepMatrix); 
          
          for (var m = 0; m < currentGeneration.length; ++m) {
             var baseMesh = currentGeneration[m];
             var copy = this._createMeshCopy(baseMesh); // Deep copy aquí

             if (useWorldReference) {
               mat4.mul(copy.getMatrix(), accumMatrix, copy.getMatrix());
               mat4.mul(copy.getEditMatrix(), accumMatrix, copy.getEditMatrix());
             } else {
               mat4.mul(copy.getMatrix(), copy.getMatrix(), accumMatrix);
               mat4.mul(copy.getEditMatrix(), copy.getEditMatrix(), accumMatrix);
             }

             // FIX: Actualizar caja de colisión inmediatamente para selección
             copy.updateMatrices(this._camera);

             nextGeneration.push(copy); 
             allNewCopies.push(copy);   
          }
        }
        currentGeneration = nextGeneration; 
      }
      
    } catch(e) {
      console.error(e);
      window.alert("Error generating pattern geometry.");
      return;
    }

    this._addMeshes(allNewCopies, allNewCopies[allNewCopies.length-1]);
  }

  _createMeshCopy(mesh) {
    var copy = new MeshStatic(mesh.getGL());
    var srcData = mesh.getMeshData();
    var dstData = copy.getMeshData();

    // Copiar contadores básicos
    dstData._nbVertices = srcData._nbVertices;
    dstData._nbFaces = srcData._nbFaces;
    dstData._nbTexCoords = srcData._nbTexCoords;

    // Copiar arrays de geometría (deep copy)
    if (srcData._verticesXYZ) dstData._verticesXYZ = new Float32Array(srcData._verticesXYZ);
    if (srcData._colorsRGB) dstData._colorsRGB = new Float32Array(srcData._colorsRGB);
    if (srcData._materialsPBR) dstData._materialsPBR = new Float32Array(srcData._materialsPBR);
    if (srcData._normalsXYZ) dstData._normalsXYZ = new Float32Array(srcData._normalsXYZ);
    if (srcData._facesABCD) dstData._facesABCD = srcData._facesABCD instanceof Uint32Array ? new Uint32Array(srcData._facesABCD) : new Uint16Array(srcData._facesABCD);
    if (srcData._texCoordsST) dstData._texCoordsST = new Float32Array(srcData._texCoordsST);
    if (srcData._UVfacesABCD) dstData._UVfacesABCD = srcData._UVfacesABCD instanceof Uint32Array ? new Uint32Array(srcData._UVfacesABCD) : new Uint16Array(srcData._UVfacesABCD);
    if (srcData._duplicateStartCount) dstData._duplicateStartCount = srcData._duplicateStartCount.slice();

    // Copiar matrices de transformación
    mat4.copy(copy.getMatrix(), mesh.getMatrix());
    mat4.copy(copy.getEditMatrix(), mesh.getEditMatrix());
    vec3.copy(copy.getCenter(), mesh.getCenter());

    // Copiar configuración de renderizado
    if (copy.copyRenderConfig) copy.copyRenderConfig(mesh);

    // Inicializar topología ANTES de computar octree (requiere geometría completa)
    copy.init(); // Incluye initTopology() para permitir sculpting en copias

    // Computar estructuras espaciales
    copy.computeOctree();
    copy.updateCenter();

    // Inicializar renderizado y buffers
    copy.initRender();
    if (copy.getRenderData()) {
        copy.updateGeometryBuffers();
        if (copy.updateDuplicateColorsAndMaterials) copy.updateDuplicateColorsAndMaterials();
    }

    return copy;
  }

  _addMeshes(meshes, mesh) {
    if (!meshes.length) return;
    Array.prototype.push.apply(this._meshes, meshes);
    this._stateManager.pushStateAdd(meshes);
    if (mesh !== undefined) this.setMesh(mesh);
    else this.setMesh(meshes[meshes.length - 1]);
  }

  onLoadAlphaImage(img, name, controller) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, img.width, img.height).data;
    var alpha = data.subarray(0, data.length / 4);
    for (var i = 0, j = 0, l = alpha.length; i < l; ++i, j += 4) {
      alpha[i] = Math.round((data[j] + data[j + 1] + data[j + 2]) / 3);
    }
    var alphas = {};
    alphas[name = Gui.addAlpha(alpha, img.width, img.height, name)._name] = name;
    this.getGui().addAlphaOptions(alphas);
    if (controller && controller._ctrlAlpha) controller._ctrlAlpha.setValue(name);
  }
}

export default Scene;
