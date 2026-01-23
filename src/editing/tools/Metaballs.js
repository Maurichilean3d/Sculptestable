import { vec3 } from 'gl-matrix';
import SculptBase from 'editing/tools/SculptBase';
import MarchingCubes from 'editing/MarchingCubes';

class Metaballs extends SculptBase {

  constructor(main) {
    super(main);

    this._radius = 50;
    this._resolution = 30; // Resolución del grid
    this._smoothness = 40.0; // Factor de mezcla suave (k)
    
    // Almacena las posiciones del trazo actual
    this._spheres = []; 
    this._lastSphereIndex = 0;
  }

  start(ctrl) {
    var started = super.start(ctrl);
    if (!started) return false;

    var picking = this._main.getPicking();
    this.stroke(picking);
    return true;
  }

  end() {
    // Al soltar el mouse, podrías hacer limpieza o consolidar si fuera necesario
    // Por ahora, la geometría ya está pegada en la malla, así que solo limpiamos
    this._spheres = [];
    super.end();
  }

  startSculpt() {
    // Al iniciar un trazo, limpiamos la lista y empezamos de nuevo
    this._spheres = [];
    this._lastSphereIndex = 0;
    super.startSculpt();
  }

  stroke(picking) {
    var inter = picking.getIntersectionPoint();
    if (!inter) return;

    // Solo agregamos una nueva esfera si nos hemos movido lo suficiente
    // para evitar generar geometría innecesaria en el mismo punto
    if (this._spheres.length > 0) {
      var last = this._spheres[this._spheres.length - 1];
      var dist = vec3.dist(inter, last);
      if (dist < this._radius * 0.2) return; // Mínimo desplazamiento
    }

    this._spheres.push(vec3.clone(inter));

    // Generamos la metaball combinada de TODAS las esferas del trazo actual
    // Nota: Para optimizar, en un caso real solo recalcularíamos el área afectada,
    // pero aquí regeneramos el grupo para garantizar la fusión perfecta.
    var generated = this.generateGroupMetaballs(this._spheres, this._radius, this._resolution);
    
    if (!generated.vertices || generated.vertices.length === 0) return;

    // A diferencia del anterior que hacía "append", aquí necesitamos reemplazar
    // la geometría del trazo anterior para dar la ilusión de animación fluida,
    // o simplemente agregarla si asumimos que SculptGL maneja updates rápidos.
    // Como SculptGL no tiene un "layer temporal" fácil de acceder desde aquí,
    // haremos una estrategia simplificada:
    // Esta herramienta funcionará mejor haciendo "clicks" o trazos cortos, 
    // ya que "appendGeometry" acumula geometría en la malla base.
    
    // Para una verdadera herramienta de trazo fluido, necesitaríamos un sistema de "preview mesh".
    // Dado el sistema actual, fusionaremos el trazo completo al final o por pasos.
    // Para simplificar y que funcione directo:
    
    this.appendGeometry(generated);
    
    // TRUCO: Para evitar que se duplique la geometría anterior del mismo trazo,
    // idealmente solo deberíamos agregar la "diferencia", pero con Marching Cubes es difícil.
    // Por tanto, esta implementación generará mucha geometría superpuesta si el trazo es largo.
    // RECOMENDACIÓN DE USO: Hacer clicks individuales o trazos muy cortos, luego REMESH.
  }

  // Función de Mínimo Suave (Smooth Minimum) polinomial
  // k controla la suavidad de la unión
  smin(a, b, k) {
    var h = Math.max(k - Math.abs(a - b), 0.0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }

  generateGroupMetaballs(spheres, radius, res) {
    if (spheres.length === 0) return {};

    // 1. Calcular Bounding Box del grupo de esferas
    var min = vec3.clone(spheres[0]);
    var max = vec3.clone(spheres[0]);
    var margin = radius * 2.0; // Margen para asegurar que el campo llegue a 0

    for (var i = 1; i < spheres.length; i++) {
      vec3.min(min, min, spheres[i]);
      vec3.max(max, max, spheres[i]);
    }
    vec3.sub(min, min, [margin, margin, margin]);
    vec3.add(max, max, [margin, margin, margin]);

    var sizeX = max[0] - min[0];
    var sizeY = max[1] - min[1];
    var sizeZ = max[2] - min[2];
    
    // Ajustar resolución proporcional al tamaño (para no perder detalle en trazos largos)
    // o mantenerla fija localmente. Usaremos un paso fijo basado en el radio.
    var step = (radius * 2) / 10.0; // Calidad fija: 10 celdas por diámetro
    
    var resX = Math.ceil(sizeX / step);
    var resY = Math.ceil(sizeY / step);
    var resZ = Math.ceil(sizeZ / step);
    
    // Límite de seguridad para evitar colgar el navegador
    if (resX * resY * resZ > 1000000) {
        step *= 2.0; 
        resX = Math.ceil(sizeX / step);
        resY = Math.ceil(sizeY / step);
        resZ = Math.ceil(sizeZ / step);
    }

    var dims = [resX, resY, resZ];
    var numVoxels = resX * resY * resZ;
    
    var colorField = new Float32Array(numVoxels * 3);
    var materialField = new Float32Array(numVoxels * 3);
    var distanceField = new Float32Array(numVoxels);

    var defColor = [1.0, 1.0, 1.0]; 
    var defMat = [0.18, 0.08, 1.0];

    var idx = 0;
    // Recorrer el grid
    for (var z = 0; z < resZ; ++z) {
      var pz = min[2] + z * step;
      for (var y = 0; y < resY; ++y) {
        var py = min[1] + y * step;
        for (var x = 0; x < resX; ++x) {
          var px = min[0] + x * step;

          // Calcular SDF (Distancia a la superficie implícita)
          // Empezamos con "infinito"
          var d = 100000.0;
          
          // Mezclamos la distancia de todas las esferas
          for (var s = 0; s < spheres.length; s++) {
             var cen = spheres[s];
             // Distancia a la esfera actual
             var distSphere = Math.sqrt(
                (px - cen[0])*(px - cen[0]) + 
                (py - cen[1])*(py - cen[1]) + 
                (pz - cen[2])*(pz - cen[2])
             ) - radius;
             
             // Fusión suave
             d = this.smin(d, distSphere, this._smoothness);
          }

          distanceField[idx] = d;

          // Color y material (simples)
          colorField[idx * 3] = defColor[0];
          colorField[idx * 3 + 1] = defColor[1];
          colorField[idx * 3 + 2] = defColor[2];
          materialField[idx * 3] = defMat[0];
          materialField[idx * 3 + 1] = defMat[1];
          materialField[idx * 3 + 2] = defMat[2];

          idx++;
        }
      }
    }

    var voxels = {
      dims: dims,
      colorField: colorField,
      materialField: materialField,
      distanceField: distanceField
    };

    var data = MarchingCubes.computeSurface(voxels);

    // Transformar vértices de vuelta al espacio mundial
    var v = data.vertices;
    for (var j = 0; j < v.length; j += 3) {
      v[j] = min[0] + v[j] * step;
      v[j + 1] = min[1] + v[j + 1] * step;
      v[j + 2] = min[2] + v[j + 2] * step;
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

    var offset = vOld.length / 3;
    for (var i = 0; i < fNew.length; i += 4) {
      fNew[i] += offset;
      fNew[i + 1] += offset;
      fNew[i + 2] += offset;
    }

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

    mesh.setVertices(vTotal);
    mesh.setFaces(fTotal);
    mesh.setColors(cTotal);
    mesh.setMaterials(mTotal);

    mesh.init();
    mesh.initRender();
    this._main.render();
  }
}

export default Metaballs;
