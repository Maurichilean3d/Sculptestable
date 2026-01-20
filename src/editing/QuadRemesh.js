import Remesh from 'editing/Remesh';
import Smooth from 'editing/tools/Smooth';

var QuadRemesh = {};

QuadRemesh.RESOLUTION = 150;
QuadRemesh.RELAX_ITERATIONS = 6;
QuadRemesh.RELAX_INTENSITY = 0.4;
QuadRemesh.TANGENT = true;

QuadRemesh.remesh = function (meshes, baseMesh) {
  var prevResolution = Remesh.RESOLUTION;
  Remesh.RESOLUTION = QuadRemesh.RESOLUTION;
  var newMesh = Remesh.remesh(meshes, baseMesh, false);
  Remesh.RESOLUTION = prevResolution;
  QuadRemesh.relax(newMesh);
  return newMesh;
};

QuadRemesh.relax = function (mesh) {
  if (!mesh || QuadRemesh.RELAX_ITERATIONS <= 0)
    return;

  var nbVertices = mesh.getNbVertices();
  var indices = new Uint32Array(nbVertices);
  for (var i = 0; i < nbVertices; ++i) indices[i] = i;

  var smooth = new Smooth(null);
  smooth.setToolMesh(mesh);
  for (var iter = 0; iter < QuadRemesh.RELAX_ITERATIONS; ++iter) {
    if (QuadRemesh.TANGENT)
      smooth.smoothTangent(indices, QuadRemesh.RELAX_INTENSITY);
    else
      smooth.smooth(indices, QuadRemesh.RELAX_INTENSITY);
    mesh.updateGeometry();
  }
  mesh.updateGeometryBuffers();
};

export default QuadRemesh;
