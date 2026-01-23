import { vec3 } from 'gl-matrix';
import Tools from 'editing/tools/Tools';
import Gizmo from 'editing/Gizmo';
import TR from 'gui/GuiTR';
import Picking from 'math3d/Picking';
import Enums from 'misc/Enums';
import Utils from 'misc/Utils';

var GuiSculptingTools = {};
GuiSculptingTools.tools = [];
var GuiTools = GuiSculptingTools.tools;

GuiSculptingTools.initGuiTools = function (sculpt, menu, main) {
  // init each tools ui
  for (var i = 0, nbTools = Tools.length; i < nbTools; ++i) {
    if (!Tools[i]) continue;
    var uTool = GuiTools[i];
    if (!uTool) {
      console.error('No gui for tool index : ' + i);
      GuiSculptingTools[i] = {
        _ctrls: [],
        init: function () {}
      };
      uTool = GuiTools[i];
    }

    // CORRECCIÓN: Evitar inicializar dos veces la misma herramienta
    if (uTool._initialized) {
        // Opcional: Si quisieras limpiar para reinicializar, harías limpieza aquí.
        // Por ahora, simplemente evitamos duplicar si ya existe.
        continue;
    }
    
    uTool.init(sculpt.getTool(i), menu, main);
    uTool._initialized = true; // Marcamos como inicializada
    
    GuiSculptingTools.hide(i);
  }
};

GuiSculptingTools.hide = function (toolIndex) {
  if (!GuiTools[toolIndex] || !GuiTools[toolIndex]._ctrls) return;
  for (var i = 0, ctrls = GuiTools[toolIndex]._ctrls, nbCtrl = ctrls.length; i < nbCtrl; ++i)
    ctrls[i].setVisibility(false);
};

GuiSculptingTools.show = function (toolIndex) {
  if (!GuiTools[toolIndex] || !GuiTools[toolIndex]._ctrls) return;
  for (var i = 0, ctrls = GuiTools[toolIndex]._ctrls, nbCtrl = ctrls.length; i < nbCtrl; ++i)
    ctrls[i].setVisibility(true);
  if (GuiTools[toolIndex].onShow)
    GuiTools[toolIndex].onShow();
};

var setOnChange = function (key, factor, val) {
  this[key] = factor ? val / factor : val;
};

// some helper functions
var addCtrlRadius = function (tool, fold, widget, main) {
  var ctrl = fold.addSlider(TR('sculptRadius'), tool._radius, function (val) {
    setOnChange.call(tool, '_radius', 1, val);
    main.getSculptManager().getSelection().setIsEditMode(true);
    main.renderSelectOverRtt();
  }, 5, 500, 1);
  widget._ctrlRadius = ctrl;
  return ctrl;
};
var addCtrlIntensity = function (tool, fold, widget) {
  var ctrl = fold.addSlider(TR('sculptIntensity'), tool._intensity * 100, setOnChange.bind(tool, '_intensity', 100), 0, 100, 1);
  widget._ctrlIntensity = ctrl;
  return ctrl;
};
var addCtrlHardness = function (tool, fold) {
  return fold.addSlider(TR('sculptHardness'), tool._hardness * 100, setOnChange.bind(tool, '_hardness', 100), 0, 100, 1);
};
var addCtrlCulling = function (tool, fold) {
  return fold.addCheckbox(TR('sculptCulling'), tool, '_culling');
};
var addCtrlNegative = function (tool, fold, widget, name) {
  var ctrl = fold.addCheckbox(name || TR('sculptNegative'), tool, '_negative');
  widget.toggleNegative = function () {
    ctrl.setValue(!ctrl.getValue());
  };
  return ctrl;
};

var importAlpha = function () {
  document.getElementById('alphaopen').click();
};
var addCtrlAlpha = function (ctrls, fold, tool, ui) {
  ctrls.push(fold.addTitle(TR('sculptAlphaTitle')));
  if (tool._lockPosition !== undefined)
    ctrls.push(fold.addCheckbox(TR('sculptLockPositon'), tool, '_lockPosition'));
  ui._ctrlAlpha = fold.addCombobox(TR('sculptAlphaTex'), tool, '_idAlpha', Picking.ALPHAS_NAMES);
  ctrls.push(ui._ctrlAlpha);
  ctrls.push(fold.addButton(TR('sculptImportAlpha'), importAlpha));
};

GuiTools[Enums.Tools.BRUSH] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0; // Limpieza preventiva array
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlNegative(tool, fold, this));
    this._ctrls.push(fold.addCheckbox(TR('sculptClay'), tool, '_clay'));
    this._ctrls.push(fold.addCheckbox(TR('sculptAccumulate'), tool, '_accumulate'));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.CREASE] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlNegative(tool, fold, this));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.DRAG] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.FLATTEN] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlNegative(tool, fold, this));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.INFLATE] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlNegative(tool, fold, this));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.PAINT] = {
  _ctrls: [],
  onMaterialChanged: function (main, tool, materials) {
    vec3.copy(tool._color, materials[0].getValue());
    tool._material[0] = materials[1].getValue() / 100;
    tool._material[1] = materials[2].getValue() / 100;

    var mesh = main.getMesh();
    if (!mesh) return;

    if (tool._writeAlbedo) mesh.setAlbedo(tool._color);
    if (tool._writeRoughness) mesh.setRoughness(tool._material[0]);
    if (tool._writeMetalness) mesh.setMetallic(tool._material[1]);
    main.render();
  },
  resetMaterialOverride: function (main, tool) {
    if (this._ctrlPicker.getValue() !== tool._pickColor)
      this._ctrlPicker.setValue(tool._pickColor);

    var mesh = main.getMesh();
    if (!mesh || !mesh.getAlbedo) return;

    mesh.getAlbedo()[0] = -1.0;
    mesh.setRoughness(-1.0);
    mesh.setMetallic(-1.0);
    main.render();
  },
  onPickedMaterial: function (materials, tool, main, color, roughness, metallic) {
    main.setCanvasCursor(Utils.cursors.dropper);
    materials[0].setValue(color, true);
    materials[1].setValue(roughness * 100, true);
    materials[2].setValue(metallic * 100, true);
    vec3.copy(tool._color, color);
    tool._material[0] = roughness;
    tool._material[1] = metallic;
  },
  onColorPick: function (tool, main, val) {
    tool._pickColor = val;
    main.setCanvasCursor(val ? Utils.cursors.dropper : 'default');
    main._action = val ? Enums.Action.SCULPT_EDIT : Enums.Action.NOTHING;
    main.renderSelectOverRtt();
  },
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlHardness(tool, fold, this));
    this._ctrls.push(addCtrlCulling(tool, fold));

    this._ctrls.push(fold.addTitle(TR('sculptPBRTitle')));
    this._ctrls.push(fold.addButton(TR('sculptPaintAll'), tool, 'paintAll'));
    this._ctrlPicker = fold.addCheckbox(TR('sculptPickColor'), tool._pickColor, this.onColorPick.bind(this, tool, main));
    this._ctrls.push(this._ctrlPicker);

    var materials = [];
    var cbMatChanged = this.onMaterialChanged.bind(this, main, tool, materials);
    var ctrlColor = fold.addColor(TR('sculptColor'), tool._color, cbMatChanged);
    var ctrlRoughness = fold.addSlider(TR('sculptRoughness'), tool._material[0] * 100, cbMatChanged, 0, 100, 1);
    var ctrlMetallic = fold.addSlider(TR('sculptMetallic'), tool._material[1] * 100, cbMatChanged, 0, 100, 1);
    materials.push(ctrlColor, ctrlRoughness, ctrlMetallic);
    this._ctrls.push(ctrlColor, ctrlRoughness, ctrlMetallic);
    tool.setPickCallback(this.onPickedMaterial.bind(this, materials, tool, main));

    // mask
    this._ctrls.push(fold.addTitle('Write channel'));
    this._ctrls.push(fold.addCheckbox(TR('sculptColor'), tool, '_writeAlbedo'));
    this._ctrls.push(fold.addCheckbox(TR('sculptRoughness'), tool, '_writeRoughness'));
    this._ctrls.push(fold.addCheckbox(TR('sculptMetallic'), tool, '_writeMetalness'));

    window.addEventListener('keyup', this.resetMaterialOverride.bind(this, main, tool));
    window.addEventListener('mouseup', this.resetMaterialOverride.bind(this, main, tool));

    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.PINCH] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlNegative(tool, fold, this));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.TWIST] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.LOCALSCALE] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.MOVE] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(fold.addCheckbox(TR('sculptTopologicalCheck'), tool, '_topoCheck'));
    this._ctrls.push(addCtrlNegative(tool, fold, this, TR('sculptMoveAlongNormal')));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.SMOOTH] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(fold.addCheckbox(TR('sculptTangentialSmoothing'), tool, '_tangent'));
    this._ctrls.push(addCtrlCulling(tool, fold));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.MASKING] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    this._ctrls.push(addCtrlIntensity(tool, fold, this));
    this._ctrls.push(addCtrlHardness(tool, fold, this));
    this._ctrls.push(addCtrlNegative(tool, fold, this));
    this._ctrls.push(addCtrlCulling(tool, fold));
    this._main = main;
    this._tool = tool;
    var bci = fold.addDualButton(TR('sculptMaskingClear'), TR('sculptMaskingInvert'), tool, tool, 'clear', 'invert');
    var bbs = fold.addDualButton(TR('sculptMaskingBlur'), TR('sculptMaskingSharpen'), tool, tool, 'blur', 'sharpen');
    this._ctrls.push(bci[0], bci[1], bbs[0], bbs[1]);
    // mask extract
    this._ctrls.push(fold.addTitle(TR('sculptExtractTitle')));
    this._ctrls.push(fold.addSlider(TR('sculptExtractThickness'), tool, '_thickness', -5, 5, 0.001));
    this._ctrls.push(fold.addButton(TR('sculptExtractAction'), tool, 'extract'));
    addCtrlAlpha(this._ctrls, fold, tool, this);
  }
};

GuiTools[Enums.Tools.TRANSFORM] = {
  _ctrls: [],
  _ctrlCoordSpace: null,
  _ctrlOpFilter: null,
  _ctrlAxisFilter: null,
  _main: null,
  _tool: null,
  _opFilter: 0,
  _axisFilter: 0,
  _getOperationMask: function () {
    switch (this._opFilter) {
    case 1:
      return Gizmo.TRANS_XYZ | Gizmo.PLANE_XYZ;
    case 2:
      return Gizmo.ROT_XYZ | Gizmo.ROT_W;
    case 3:
      return Gizmo.SCALE_XYZW;
    default:
      return Gizmo.TRANS_XYZ | Gizmo.PLANE_XYZ | Gizmo.ROT_XYZ | Gizmo.ROT_W | Gizmo.SCALE_XYZW;
    }
  },
  _getAxisMask: function () {
    switch (this._axisFilter) {
    case 1:
      return { trans: Gizmo.TRANS_X, rot: Gizmo.ROT_X, scale: Gizmo.SCALE_X };
    case 2:
      return { trans: Gizmo.TRANS_Y, rot: Gizmo.ROT_Y, scale: Gizmo.SCALE_Y };
    case 3:
      return { trans: Gizmo.TRANS_Z, rot: Gizmo.ROT_Z, scale: Gizmo.SCALE_Z };
    default:
      return null;
    }
  },
  _applyGizmoFilters: function () {
    var mask = this._getOperationMask();
    var axisMask = this._getAxisMask();
    if (axisMask) {
      var axisCombined = 0;
      if (mask & Gizmo.TRANS_XYZ) axisCombined |= axisMask.trans;
      if (mask & Gizmo.PLANE_XYZ) axisCombined |= axisMask.trans;
      if (mask & Gizmo.ROT_XYZ) axisCombined |= axisMask.rot;
      if (mask & Gizmo.ROT_W) axisCombined |= axisMask.rot;
      if (mask & Gizmo.SCALE_XYZW) axisCombined |= axisMask.scale;
      mask = axisCombined;
    }
    this._tool._gizmo.setActivatedType(mask);
    this._main.render();
  },
  _onCoordSpaceChanged: function (value) {
    this._tool._gizmo.setCoordSpace(value);
    this._main.render();
  },
  _onOpFilterChanged: function (value) {
    this._opFilter = value;
    this._applyGizmoFilters();
  },
  _onAxisFilterChanged: function (value) {
    this._axisFilter = value;
    this._applyGizmoFilters();
  },
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._main = main;
    this._tool = tool;
    this._ctrls.push(fold.addTitle(TR('sculptGizmoTransform')));
    this._ctrlCoordSpace = fold.addCombobox(TR('sculptCoordSpace'), tool._gizmo.getCoordSpace(), this._onCoordSpaceChanged.bind(this), [TR('sculptGlobal'), TR('sculptLocal')]);
    this._ctrls.push(this._ctrlCoordSpace);
    this._ctrls.push(fold.addTitle(TR('sculptGizmoFilters')));
    this._ctrlOpFilter = fold.addCombobox(TR('sculptGizmoOperation'), this._opFilter, this._onOpFilterChanged.bind(this), [TR('sculptGizmoAll'), TR('sculptGizmoMove'), TR('sculptGizmoRotate'), TR('sculptGizmoScale')]);
    this._ctrlAxisFilter = fold.addCombobox(TR('sculptGizmoAxis'), this._axisFilter, this._onAxisFilterChanged.bind(this), [TR('sculptGizmoAll'), TR('sculptGizmoAxisX'), TR('sculptGizmoAxisY'), TR('sculptGizmoAxisZ')]);
    this._ctrls.push(this._ctrlOpFilter, this._ctrlAxisFilter);
    this._applyGizmoFilters();
  }
};

GuiTools[Enums.Tools.ELEMENTSELECT] = {
  _ctrls: [],
  init: function (tool, fold) {
    this._ctrls.length = 0;
    var modeOptions = [];
    modeOptions[tool.constructor.Mode.VERTEX] = TR('sculptElementSelectVertex');
    modeOptions[tool.constructor.Mode.EDGE] = TR('sculptElementSelectEdge');
    modeOptions[tool.constructor.Mode.FACE] = TR('sculptElementSelectFace');

    var actionOptions = [];
    actionOptions[tool.constructor.Action.REPLACE] = TR('sculptElementSelectReplace');
    actionOptions[tool.constructor.Action.ADD] = TR('sculptElementSelectAdd');
    actionOptions[tool.constructor.Action.REMOVE] = TR('sculptElementSelectRemove');

    this._ctrls.push(fold.addTitle(TR('sculptElementSelect')));
    this._ctrls.push(fold.addCombobox(TR('sculptElementSelectMode'), tool._selectionMode, function (val) {
      tool._selectionMode = val;
    }, modeOptions));
    this._ctrls.push(fold.addCombobox(TR('sculptElementSelectAction'), tool._selectionAction, function (val) {
      tool._selectionAction = val;
    }, actionOptions));

    this._ctrls.push(fold.addButton(TR('sculptElementSelectAll'), tool, 'selectAll'));
    this._ctrls.push(fold.addButton(TR('sculptElementSelectClear'), tool, 'clearSelection'));
    this._ctrls.push(fold.addButton(TR('sculptElementSelectInvert'), tool, 'invertSelection'));
  }
};

// METABALLS - Corregido para evitar duplicación
GuiTools[Enums.Tools.METABALLS] = {
  _ctrls: [],
  init: function (tool, fold, main) {
    this._ctrls.length = 0;
    this._ctrls.push(addCtrlRadius(tool, fold, this, main));
    
    // Slider para resolución
    this._ctrls.push(fold.addSlider('Resolution', tool._resolution, function (val) {
      tool._resolution = val;
    }, 10, 80, 1));
    
    // Smoothness (opcional)
    if(tool._smoothness !== undefined) {
       this._ctrls.push(fold.addSlider('Smoothness', tool._smoothness, function (val) {
         tool._smoothness = val;
       }, 0.1, 100, 0.1));
    }
  }
};

export default GuiSculptingTools;
