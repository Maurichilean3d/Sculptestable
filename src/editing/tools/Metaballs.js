import { vec3 } from 'gl-matrix';
import SculptBase from 'editing/tools/SculptBase';
import MarchingCubes from 'editing/MarchingCubes';
import Utils from 'misc/Utils';

class Metaballs extends SculptBase {

  constructor(main) {
    super(main);
    this._radius = 50;
    this._resolution = 20; // Resolución del grid
    this._detail = 1.0; 
  }

  start(picking) {
    // Generar metaball al hacer click
    this.stroke(picking);
  }

  stroke(picking) {
    var inter = picking.getIntersectionPoint();
    if (!inter) return;

    // 1. Generar Geometría (Vértices, caras, colores, materiales)
    var generated = this.generateMetaball(inter, this._radius, this._resolution);
    
    // Si no se generó nada, salir
    if (!generated.vertices || generated.vertices.length === 0) return;

    // 2. Fusionar con la malla existente
    this.appendGeometry(generated);
  }

  generateMetaball(center, radius, res) {
    var dims = [res, res, res];
    var size = radius * 2.5; 
    var halfSize = size * 0.5;
    var step = size / res;

    var numVoxels = res * res * res;
    var colorField = new Float32Array(numVoxels * 3);
    var materialField = new Float32Array(numVoxels * 3);
    var distanceField = new Float32Array(numVoxels);

    // Color y material por defecto
    var defColor = [1.0, 1.0, 1.0]; 
    var defMat = [0.18, 0.08, 1.0]; // Roughness, Metalness, Mask

    var i = 0;
    for (var z = 0; z < res; ++z) {
      var pz = (z * step) - halfSize;
      for (var y = 0; y < res; ++y) {
        var py = (y * step) - halfSize;
        for (var x = 0; x < res; ++x) {
          var px = (x * step) - halfSize;

          // SDF Esfera: length(p) - r
          var dist = Math.sqrt(px*px + py*py + pz*pz) - radius;
          distanceField[i] = dist;

          colorField[i * 3] = defColor[0];
          colorField[i * 3 + 1] = defColor[1];
          colorField[i * 3 + 2] = defColor[2];

          materialField[i * 3] = defMat[0];
          materialField[i * 3 + 1] = defMat[1];
          materialField[i * 3 + 2] = defMat[2];

          i++;
        }
      }
    }

    var voxels = {
      dims: dims,
      colorField: colorField,
      materialField: materialField,
      distanceField: distanceField
    };

    // Usar MarchingCubes existente
    var data = MarchingCubes.computeSurface(voxels);

    // Ajustar posición de vértices al mundo
    var v = data.vertices;
    for (var j = 0; j < v.length; j += 3) {
      v[j] = (v[j] * step) - halfSize + center[0];
      v[j + 1] = (v[j + 1] * step) - halfSize + center[1];
      v[j + 2] = (v[j + 2] * step) - halfSize + center[2];
    }

    return data;
  }

  appendGeometry(data) {
    var mesh = this.getMesh();
    var vOld = mesh.getVertices();
    var fOld = mesh.getFaces();
    var cOld = mesh.getColors();
    var mOld = mesh.getMaterials();

    var vNew = data.vertices;
    var fNew = data.faces;
    var cNew = data.colors;
    var mNew = data.materials;

    // Calcular offset para los índices de las nuevas caras
    var offset = vOld.length / 3;
    
    // Ajustar índices de las nuevas caras
    // fNew viene como [a,b,c,TRI_INDEX, ...]
    for (var i = 0; i < fNew.length; i += 4) {
      fNew[i] += offset;
      fNew[i + 1] += offset;
      fNew[i + 2] += offset;
      // fNew[i+3] es TRI_INDEX, no se toca
    }

    // Concatenar Arrays
    var vTotal = new Float32Array(vOld.length + vNew.length);
    vTotal.set(vOld);
    vTotal.set(vNew, vOld.length);

    var fTotal = new Uint32Array(fOld.length + fNew.length);
    fTotal.set(fOld);
    fTotal.set(fNew, fOld.length);

    var cTotal = new Float32Array(cOld.length + cNew.length);
    cTotal.set(cOld);
    cTotal.set(cNew, cOld.length);

    var mTotal = new Float32Array(mOld.length + mNew.length);
    mTotal.set(mOld);
    mTotal.set(mNew, mOld.length);

    // Actualizar Mesh
    mesh.setVertices(vTotal);
    mesh.setFaces(fTotal);
    mesh.setColors(cTotal);
    mesh.setMaterials(mTotal);

    // Re-inicializar mesh para recalcular normales, octree y buffers
    mesh.init();
    mesh.initRender();
    
    // Renderizar
    this._main.render();
  }
}

export default Metaballs;
